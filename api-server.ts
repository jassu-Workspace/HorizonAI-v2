/**
 * API Proxy Server - Production Hardened
 * Handles requests to NVIDIA API to avoid CORS issues
 * Runs on a dedicated backend port, Frontend calls this instead of NVIDIA directly
 *
 * Production Features:
 * - Gzip compression
 * - Request logging with metadata
 * - Error handling with proper status codes
 * - Security headers
 * - Key rotation and failover
 * - Rate limiting with cooldown
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import compression from 'compression';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 3004);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const isLocalhostOrigin = (origin: string): boolean => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
const isVercelPreviewOrigin = (origin: string): boolean => /^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app$/.test(origin);

// Gzip compression middleware
app.use(compression({ level: 6, threshold: 512 }));

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            const isExplicitlyAllowed = ALLOWED_ORIGINS.includes(origin);
            const allowDevFallback = !IS_PRODUCTION && ALLOWED_ORIGINS.length === 0 && (isLocalhostOrigin(origin) || isVercelPreviewOrigin(origin));
            const allowVercelPreview = process.env.VERCEL_ENV === 'preview' && isVercelPreviewOrigin(origin);

            if (isExplicitlyAllowed || allowDevFallback || allowVercelPreview) {
                callback(null, true);
                return;
            }

            callback(new Error('Origin not allowed by CORS'));
        },
        methods: ['POST', 'GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: false,
    }),
);

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Request-ID', req.headers['x-request-id'] || `req_${Date.now()}`);
    next();
});

app.use(express.json({ limit: '1mb' }));

type KeyState = {
    slot: number;
    key: string;
    label: string;
    cooldownUntil: number;
    failures: number;
    lastUsedAt: number;
};

const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1';
const RATE_LIMIT_COOLDOWN_MS = Number(process.env.NVIDIA_KEY_RATE_LIMIT_COOLDOWN_MS || 65000);
const ERROR_COOLDOWN_MS = Number(process.env.NVIDIA_KEY_ERROR_COOLDOWN_MS || 3000);
const MAX_RETRIES_PER_REQUEST = Number(process.env.NVIDIA_KEY_MAX_RETRIES || 3);

const keyPool: KeyState[] = [
    { slot: 1, key: (process.env.NVIDIA_API_KEY_1 || '').trim(), label: 'key-1' },
    { slot: 2, key: (process.env.NVIDIA_API_KEY_2 || '').trim(), label: 'key-2' },
    { slot: 3, key: (process.env.NVIDIA_API_KEY_3 || '').trim(), label: 'key-3' },
    { slot: 0, key: (process.env.NVIDIA_API_KEY || '').trim(), label: 'key-default' },
]
    .filter(item => Boolean(item.key))
    .map(item => ({
    ...item,
    cooldownUntil: 0,
    failures: 0,
    lastUsedAt: 0,
}));

// Explicit model-to-key binding
const MODEL_TO_KEY_SLOT: Record<string, 1 | 2 | 3> = {
    'glm-4.7': 1,
    'z-ai/glm4.7': 1,
    'z.ai/glm4.7': 1,
    'z.ai glm 4.7': 1,
    'meta/llama-3.1-405b-instruct': 2,
    'mistralai/mistral-7b-instruct-v0.2': 3,
};

const normalizeModelName = (model: string): string => {
    const normalized = String(model || '').trim().toLowerCase();

    if (
        normalized === 'z-ai/glm4.7' ||
        normalized === 'z.ai/glm4.7' ||
        normalized === 'z.ai glm 4.7' ||
        normalized === 'glm-4.7'
    ) {
        return 'z-ai/glm4.7';
    }

    if (normalized === 'meta/llama-3.1-405b-instruct') {
        return 'meta/llama-3.1-405b-instruct';
    }

    if (normalized === 'mistralai/mistral-7b-instruct-v0.2') {
        return 'mistralai/mistral-7b-instruct-v0.2';
    }

    return model;
};

let roundRobinPointer = 0;

const isRateLimitError = (error: any): boolean => {
    const message = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || error?.code || 0);
    return status === 429 || message.includes('429') || message.includes('rate limit') || message.includes('too many requests');
};

const isNotFoundError = (error: any): boolean => {
    const message = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || error?.code || 0);
    return status === 404 || message.includes('404') || message.includes('not found');
};

const getAvailableKeys = (): KeyState[] => {
    const now = Date.now();
    return keyPool.filter(k => now >= k.cooldownUntil);
};

const pickNextKey = (forModel: string): KeyState | null => {
    const mappedSlot = MODEL_TO_KEY_SLOT[forModel];
    if (!mappedSlot) return null;

    const available = getAvailableKeys().filter(k => k.slot === mappedSlot);
    if (available.length === 0) return null;

    for (let i = 0; i < available.length; i++) {
        const idx = (roundRobinPointer + i) % available.length;
        const candidate = available[idx];
        if (Date.now() >= candidate.cooldownUntil) {
            roundRobinPointer = (idx + 1) % available.length;
            candidate.lastUsedAt = Date.now();
            return candidate;
        }
    }

    return available.sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0] || null;
};

const pickAnyAvailableKey = (): KeyState | null => {
    const available = getAvailableKeys();
    if (available.length === 0) return null;

    for (let i = 0; i < available.length; i++) {
        const idx = (roundRobinPointer + i) % available.length;
        const candidate = available[idx];
        if (Date.now() >= candidate.cooldownUntil) {
            roundRobinPointer = (idx + 1) % available.length;
            candidate.lastUsedAt = Date.now();
            return candidate;
        }
    }

    return available.sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0] || null;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createClientForKey = (apiKey: string) => new OpenAI({
    apiKey,
    baseURL: NVIDIA_BASE_URL,
});

const summarizeKeyHealth = () => keyPool.map(k => ({
    label: k.label,
    inCooldown: Date.now() < k.cooldownUntil,
    failures: k.failures,
}));

const supabaseAuthClient = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    : null;

const readAuthToken = (authHeader: string | undefined): string | null => {
    const header = String(authHeader || '');
    if (!header.startsWith('Bearer ')) return null;
    const token = header.substring('Bearer '.length).trim();
    return token || null;
};

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'horizon-api-proxy',
        keysConfigured: keyPool.length,
        timestamp: new Date().toISOString(),
    });
});

// Chat completions proxy
app.post('/api/chat', async (req, res) => {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;

    try {
        const token = readAuthToken(req.header('Authorization'));
        if (!token || !supabaseAuthClient) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { data: authData, error: authError } = await supabaseAuthClient.auth.getUser(token);
        if (authError || !authData.user) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        const { model, messages, temperature, top_p, max_tokens } = req.body;
        const requestedModel = normalizeModelName(model);

        if (!model || !Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
            return res.status(400).json({ error: 'Missing required fields: model, messages' });
        }

        const messagesAreValid = messages.every((m: any) => {
            const role = String(m?.role || '');
            const content = String(m?.content || '');
            return ['system', 'user', 'assistant'].includes(role) && content.length > 0 && content.length <= 4000;
        });
        if (!messagesAreValid) {
            return res.status(400).json({ error: 'Invalid messages payload' });
        }

        if (!MODEL_TO_KEY_SLOT[requestedModel]) {
            return res.status(400).json({
                error: `Unsupported model '${model}'. Allowed models: z-ai/glm4.7, meta/llama-3.1-405b-instruct, mistralai/mistral-7b-instruct-v0.2`,
            });
        }

        if (keyPool.length === 0) {
            console.error('[' + requestId + '] Missing NVIDIA API keys');
            return res.status(500).json({ error: 'NVIDIA API keys not configured on server' });
        }

        let lastError: any = null;
        const maxAttempts = Math.max(1, MAX_RETRIES_PER_REQUEST);

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const keyState = pickNextKey(requestedModel) || pickAnyAvailableKey();

            if (!keyState) {
                const soonest = Math.min(...keyPool.map(k => k.cooldownUntil));
                const waitMs = Math.max(300, soonest - Date.now());
                if (waitMs > 1500) break;
                await wait(waitMs);
                continue;
            }

            try {
                const client = createClientForKey(keyState.key);
                const completion = await client.chat.completions.create({
                    model: requestedModel,
                    messages,
                    temperature: temperature || 0.3,
                    top_p: top_p || 0.7,
                    max_tokens: max_tokens || 4096,
                    response_format: { type: 'json_object' }
                });

                keyState.failures = 0;
                keyState.cooldownUntil = 0;
                console.log('[' + requestId + '] ✅ Chat completion success via', keyState.label, 'model:', requestedModel);
                return res.json(completion);
            } catch (error: any) {
                // Provider-side fallback when requested GLM model id is unavailable.
                if (requestedModel === 'z-ai/glm4.7' && isNotFoundError(error)) {
                    try {
                        const fallbackModel = 'meta/llama-3.1-405b-instruct';
                        const fallbackKeyState = pickNextKey(fallbackModel) || pickAnyAvailableKey();
                        if (fallbackKeyState) {
                            const fallbackClient = createClientForKey(fallbackKeyState.key);
                            const completion = await fallbackClient.chat.completions.create({
                                model: fallbackModel,
                                messages,
                                temperature: temperature || 0.3,
                                top_p: top_p || 0.7,
                                max_tokens: max_tokens || 4096,
                                response_format: { type: 'json_object' }
                            });

                            fallbackKeyState.failures = 0;
                            fallbackKeyState.cooldownUntil = 0;
                            console.log('[' + requestId + '] ✅ Chat completion success via fallback model:', fallbackModel);
                            return res.json(completion);
                        }
                    } catch (fallbackError: any) {
                        lastError = fallbackError;
                    }
                }

                lastError = error;
                keyState.failures += 1;

                if (isRateLimitError(error)) {
                    keyState.cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
                    console.warn('[' + requestId + '] ⏱️ Rate limited on', keyState.label);
                } else {
                    keyState.cooldownUntil = Date.now() + ERROR_COOLDOWN_MS;
                    console.error('[' + requestId + '] ❌ Error attempt', attempt, ':', String(error?.message || 'unknown'));
                }
            }
        }

        const errorMessage = lastError?.message || 'All NVIDIA API keys failed for this request.';
        console.error('[' + requestId + '] ❌ All retries exhausted. Key health:', summarizeKeyHealth());
        return res.status(503).json({
            error: errorMessage,
            details: `Mapped key for model '${requestedModel}' is exhausted or cooling down. Retry shortly.`,
        });
    } catch (error: any) {
        console.error('[' + requestId + '] 💥 Unhandled error:', error.message);
        res.status(500).json({
            error: error.message || 'API request failed',
            details: error.error?.message || ''
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: IS_PRODUCTION ? undefined : err.message,
    });
});

app.listen(PORT, () => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ API Proxy Server running on http://localhost:${PORT}`);
    console.log(`📡 NVIDIA API KEYS: ${keyPool.length > 0 ? `${keyPool.length} configured` : '❌ MISSING'}`);
    console.log(`🌐 NVIDIA API BASE: ${NVIDIA_BASE_URL}`);
    console.log(`♻️ Key Rotation: RR enabled | 429 cooldown=${RATE_LIMIT_COOLDOWN_MS}ms | error cooldown=${ERROR_COOLDOWN_MS}ms`);
    console.log(`🔒 CORS: ${IS_PRODUCTION ? 'Production mode' : 'Dev mode'} | ${ALLOWED_ORIGINS.length} origins configured`);
    console.log(`${'='.repeat(70)}\n`);
});

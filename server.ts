/**
 * PRODUCTION SERVER - FINAL HORIZON AI
 * Serves built frontend on port 3000 + Backend API on port 3004
 * Automatically restarts on port conflicts
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== BACKEND API SERVER ====================
const backendApp = express();
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 3004);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3000);

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || `http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}`)
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const isLocalhostOrigin = (origin: string): boolean => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

// Middleware
backendApp.use(compression({ level: 6, threshold: 512 }));
backendApp.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || isLocalhostOrigin(origin) || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Origin not allowed by CORS'));
            }
        },
        methods: ['POST', 'GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }),
);

backendApp.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Request-ID', req.headers['x-request-id'] || `req_${Date.now()}`);
    next();
});

backendApp.use(express.json({ limit: '10mb' }));

// ==================== AI/NVIDIA API ROUTES ====================
const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1';
const keyPool = [
    process.env.NVIDIA_API_KEY_1,
    process.env.NVIDIA_API_KEY_2,
    process.env.NVIDIA_API_KEY_3,
    process.env.NVIDIA_API_KEY,
].filter(Boolean) as string[];

let currentKeyIndex = 0;
const getNextKey = () => {
    const key = keyPool[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % keyPool.length;
    return key;
};

backendApp.post('/api/ai/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages) return res.status(400).json({ error: 'Messages required' });

        const client = new OpenAI({
            apiKey: getNextKey(),
            baseURL: NVIDIA_BASE_URL,
        });

        const response = await client.chat.completions.create({
            model: 'meta/llama-3.1-405b-instruct',
            messages,
            max_tokens: 1024,
            temperature: 0.7,
        });

        res.json(response.choices[0].message);
    } catch (error: any) {
        console.error('[API] Chat error:', error.message);
        res.status(500).json({ error: error.message || 'AI service unavailable' });
    }
});

backendApp.post('/api/ai/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt required' });

        const client = new OpenAI({
            apiKey: getNextKey(),
            baseURL: NVIDIA_BASE_URL,
        });

        const response = await client.chat.completions.create({
            model: 'meta/llama-3.1-405b-instruct',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0.8,
        });

        res.json({ response: response.choices[0].message.content });
    } catch (error: any) {
        console.error('[API] Generate error:', error.message);
        res.status(500).json({ error: error.message || 'Generation failed' });
    }
});

backendApp.post('/api/vision/analyze', async (req, res) => {
    try {
        const { image_url, prompt } = req.body;
        if (!image_url || !prompt) {
            return res.status(400).json({ error: 'image_url and prompt required' });
        }

        const client = new OpenAI({
            apiKey: getNextKey(),
            baseURL: NVIDIA_BASE_URL,
        });

        const response = await client.chat.completions.create({
            model: 'meta/llama-3.1-405b-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: image_url } },
                    ],
                },
            ],
            max_tokens: 1024,
        });

        res.json({ analysis: response.choices[0].message.content });
    } catch (error: any) {
        console.error('[API] Vision error:', error.message);
        res.status(500).json({ error: error.message || 'Vision analysis failed' });
    }
});

backendApp.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== FRONTEND SERVER ====================
const frontendApp = express();
const distPath = join(__dirname, 'dist');

// Check if dist exists, otherwise warn
if (!existsSync(distPath)) {
    console.warn(`⚠️  WARNING: dist folder not found at ${distPath}`);
    console.warn('    Run: npm run build');
}

frontendApp.use(compression());
frontendApp.use(express.static(distPath, { maxAge: '1d', etag: false }));

// SPA fallback - always serve index.html for non-file routes
frontendApp.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'), (err: any) => {
        if (err) {
            res.status(404).send('404 - Page not found');
        }
    });
});

// ==================== START SERVERS ====================
const startServers = () => {
    // Start backend API server
    backendApp.listen(BACKEND_PORT, '0.0.0.0', () => {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║           FINAL HORIZON AI - PRODUCTION SERVER             ║
╚════════════════════════════════════════════════════════════╝

🚀 Backend API Server ready:
   http://localhost:${BACKEND_PORT}

🎨 Frontend ready:
   http://localhost:${FRONTEND_PORT}

📶 API Routes:
   POST /api/ai/chat
   POST /api/ai/generate
   POST /api/vision/analyze
   GET  /api/health

⚙️  Environment:
   Supabase: ${SUPABASE_URL ? '✅ Configured' : '❌ Missing'}
   API Keys: ${keyPool.length} key(s) loaded

🔗 Open: http://localhost:${FRONTEND_PORT}
`);
    }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${BACKEND_PORT} is in use. Trying ${BACKEND_PORT + 1}...`);
            process.env.BACKEND_PORT = String(BACKEND_PORT + 1);
            startServers();
        } else {
            console.error('Backend error:', err);
        }
    });

    // Start frontend server
    frontendApp.listen(FRONTEND_PORT, '0.0.0.0', () => {
        console.log(`✅ Frontend listening on port ${FRONTEND_PORT}`);
    }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${FRONTEND_PORT} is in use. Trying ${FRONTEND_PORT + 1}...`);
            const newPort = FRONTEND_PORT + 1;
            // Update frontend app to use new port
            frontendApp.listen(newPort, '0.0.0.0', () => {
                console.log(`✅ Frontend listening on port ${newPort}`);
            });
        } else {
            console.error('Frontend error:', err);
        }
    });
};

startServers();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n📴 Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n📴 Shutting down gracefully...');
    process.exit(0);
});

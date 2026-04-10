/**
 * Jobs API — Roadmap Generation Job Queue
 * Production hardened with CORS, error handling, input validation
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1';

const MODEL = 'meta/llama-3.1-405b-instruct';

type KeyState = {
    slot: number;
    key: string;
    label: string;
    cooldownUntil: number;
    failures: number;
    lastUsedAt: number;
};

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

const primaryKeyPool = keyPool.filter(item => item.slot !== 0);
const fallbackKeyPool = keyPool.filter(item => item.slot === 0);
let roundRobinPointer = 0;

// Parse ALLOWED_ORIGINS from env
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

type JobRow = {
    id: string;
    user_id: string;
    type: string;
    status: JobStatus;
    progress: number;
    idempotency_key: string;
    payload: Record<string, unknown>;
    result: Record<string, unknown> | null;
    error: string | null;
    created_at: string;
    updated_at: string;
};

const getAuthToken = (req: any): string | null => {
    const authHeader = String(req.headers.authorization || '');
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice('Bearer '.length).trim();
    return token || null;
};

const getAuthClient = () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
};

const getUserScopedClient = (token: string) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
    });
};

const setSecurityHeaders = (res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
};

/**
 * CORS: allow production + preview Vercel URLs + localhost dev
 */
const setCorsHeaders = (req: any, res: any): boolean => {
    const requestOrigin = String(req.headers.origin || '');

    if (!requestOrigin) {
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        return true;
    }

    const allowAll = ALLOWED_ORIGINS.length === 0;
    const isVercelPreview = /^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app$/.test(requestOrigin);
    const isExplicitlyAllowed = ALLOWED_ORIGINS.includes(requestOrigin);
    const isAllowed = allowAll || isVercelPreview || isExplicitlyAllowed;

    if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');

    return isAllowed;
};

const getAvailableKeys = (pool: KeyState[]): KeyState[] => {
    const now = Date.now();
    return pool.filter(keyState => now >= keyState.cooldownUntil);
};

const pickApiKey = (): string => {
    const availablePrimary = getAvailableKeys(primaryKeyPool);

    if (availablePrimary.length > 0) {
        for (let i = 0; i < availablePrimary.length; i++) {
            const idx = (roundRobinPointer + i) % availablePrimary.length;
            const candidate = availablePrimary[idx];

            if (Date.now() >= candidate.cooldownUntil) {
                roundRobinPointer = (idx + 1) % availablePrimary.length;
                candidate.lastUsedAt = Date.now();
                return candidate.key;
            }
        }

        const lruPrimary = availablePrimary.sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0];
        if (lruPrimary) {
            lruPrimary.lastUsedAt = Date.now();
            return lruPrimary.key;
        }
    }

    const availableFallback = getAvailableKeys(fallbackKeyPool);
    const fallbackKey = availableFallback.sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0];

    if (fallbackKey) {
        fallbackKey.lastUsedAt = Date.now();
        return fallbackKey.key;
    }

    return '';
};

const parseJsonResponse = <T,>(text: string): T => {
    const trimmed = text.trim();
    const jsonText = trimmed.replace(/^```json\s*|```\s*$/g, '').replace(/^```\s*|```\s*$/g, '');
    return JSON.parse(jsonText) as T;
};

const updateJob = async (client: any, jobId: string, patch: Record<string, unknown>) => {
    try {
        await client
            .from('jobs')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('id', jobId);
    } catch (err) {
        console.error('[jobs] Failed to update job', jobId, err);
    }
};

const generateRoadmap = async (payload: any): Promise<Record<string, unknown>> => {
    const apiKey = pickApiKey();
    if (!apiKey) {
        throw new Error('AI provider is not configured. Please contact support.');
    }

    const skill = String(payload?.skill || '').trim().slice(0, 200);
    const weeks = String(payload?.weeks || '8').trim();
    const level = String(payload?.level || 'Beginner').trim();
    const profile = payload?.profile || {};

    if (!skill) {
        throw new Error('Skill name is missing from job payload.');
    }

    // Validate weeks is a reasonable number
    const weeksNum = parseInt(weeks, 10);
    if (isNaN(weeksNum) || weeksNum < 1 || weeksNum > 52) {
        throw new Error('Invalid number of weeks specified.');
    }

    const prompt = `You are a career roadmap generator.
Create a valid JSON roadmap with this schema:
{
  "skill": "${skill}",
  "roadmap": [{"week":1,"theme":"...","goals":["..."],"resources":[{"title":"...","searchQuery":"..."}]}],
  "freePlatforms":[{"name":"...","description":"...","searchQuery":"..."}],
  "paidPlatforms":[{"name":"...","description":"...","searchQuery":"..."}],
  "books":[{"name":"...","description":"...","searchQuery":"..."}]
}
Constraints:
- Duration: ${weeksNum} weeks
- Skill level: ${level}
- User context: ${JSON.stringify(profile).slice(0, 3000)}
Only return JSON. Do not include any markdown formatting or code blocks.`;

    const client = new OpenAI({
        apiKey,
        baseURL: NVIDIA_BASE_URL,
        timeout: 55000, // 55s, under Vercel's 60s limit
    });

    const completion = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        top_p: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
    });

    const content = String(completion.choices?.[0]?.message?.content || '');
    if (!content) {
        throw new Error('AI returned an empty response. Please try again.');
    }

    let parsed: Record<string, unknown>;
    try {
        parsed = parseJsonResponse<Record<string, unknown>>(content);
    } catch {
        throw new Error('AI returned an unexpected format. Please try again.');
    }

    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).roadmap)) {
        throw new Error('AI response is incomplete. Please try again.');
    }

    if ((parsed as any).roadmap.length === 0) {
        throw new Error('AI returned an empty roadmap. Please try again with a different skill.');
    }

    return parsed;
};

export default async function handler(req: any, res: any) {
    setSecurityHeaders(res);

    const corsAllowed = setCorsHeaders(req, res);
    if (!corsAllowed && req.headers.origin) {
        return res.status(403).json({ error: 'CORS policy violation.' });
    }

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return res.status(503).json({ error: 'Backend database is not configured.' });
    }

    const token = getAuthToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const authClient = getAuthClient();
    if (!authClient) {
        return res.status(503).json({ error: 'Service temporarily unavailable.' });
    }

    let userId: string;
    try {
        const { data: authData, error: authError } = await authClient.auth.getUser(token);
        if (authError || !authData.user) {
            return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
        }
        userId = authData.user.id;
    } catch {
        return res.status(401).json({ error: 'Could not verify your session. Please sign in again.' });
    }

    const scoped = getUserScopedClient(token);
    if (!scoped) {
        return res.status(503).json({ error: 'Service temporarily unavailable.' });
    }

    // ─── GET: Fetch Job(s) ─────────────────────────────────────────────────
    if (req.method === 'GET') {
        const jobId = String(req.query?.id || '').trim();
        if (jobId) {
            try {
                const { data, error } = await scoped
                    .from('jobs')
                    .select('id, user_id, type, status, progress, idempotency_key, payload, result, error, created_at, updated_at')
                    .eq('id', jobId)
                    .eq('user_id', userId)
                    .maybeSingle();

                if (error) {
                    console.error('[jobs] fetch single failed:', error);
                    return res.status(500).json({ error: 'Failed to fetch job status.' });
                }

                if (!data) {
                    return res.status(404).json({ error: 'Job not found.' });
                }

                return res.status(200).json({ job: data });
            } catch (err) {
                console.error('[jobs] GET single exception:', err);
                return res.status(500).json({ error: 'An unexpected error occurred.' });
            }
        }

        try {
            const status = String(req.query?.status || '');
            let query = scoped
                .from('jobs')
                .select('id, user_id, type, status, progress, idempotency_key, payload, result, error, created_at, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(20);

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) {
                console.error('[jobs] fetch list failed:', error);
                return res.status(500).json({ error: 'Failed to load your jobs.' });
            }

            return res.status(200).json({ jobs: (data || []) as JobRow[] });
        } catch (err) {
            console.error('[jobs] GET list exception:', err);
            return res.status(500).json({ error: 'An unexpected error occurred.' });
        }
    }

    // ─── POST: Run or Create Job ───────────────────────────────────────────
    const action = String(req.query?.action || req.body?.action || '').trim().toLowerCase();

    if (action === 'run') {
        const jobId = String(req.body?.id || req.query?.id || '').trim();
        if (!jobId) {
            return res.status(400).json({ error: 'Job ID is required.' });
        }

        try {
            const { data: job, error: jobError } = await scoped
                .from('jobs')
                .select('id, user_id, type, status, progress, payload, result')
                .eq('id', jobId)
                .eq('user_id', userId)
                .maybeSingle();

            if (jobError) {
                console.error('[jobs] run fetch failed:', jobError);
                return res.status(500).json({ error: 'Failed to fetch job details.' });
            }

            if (!job) {
                return res.status(404).json({ error: 'Job not found.' });
            }

            if (job.status === 'completed') {
                return res.status(200).json({ job, reused: true });
            }

            if (job.status === 'running') {
                return res.status(202).json({ job, reused: true });
            }

            await updateJob(scoped, jobId, { status: 'running' as JobStatus, progress: 10, error: null });

            try {
                if (job.type !== 'roadmap_generation') {
                    throw new Error('Unsupported job type.');
                }

                const result = await generateRoadmap(job.payload);
                await updateJob(scoped, jobId, {
                    status: 'completed' as JobStatus,
                    progress: 100,
                    result,
                    error: null,
                });

                const { data: fresh } = await scoped
                    .from('jobs')
                    .select('id, user_id, type, status, progress, idempotency_key, payload, result, error, created_at, updated_at')
                    .eq('id', jobId)
                    .maybeSingle();

                return res.status(200).json({ job: fresh || null, reused: false });
            } catch (error: any) {
                const errMsg = String(error?.message || 'Roadmap generation failed. Please try again.');
                await updateJob(scoped, jobId, {
                    status: 'failed' as JobStatus,
                    progress: 100,
                    error: errMsg,
                });

                console.error('[jobs] Job execution failed:', error);
                return res.status(500).json({ error: errMsg });
            }
        } catch (err: any) {
            console.error('[jobs] run action exception:', err);
            return res.status(500).json({ error: 'An unexpected error occurred while running the job.' });
        }
    }

    // ─── POST: Create Job ──────────────────────────────────────────────────
    const type = String(req.body?.type || '');
    const idempotencyKey = String(req.body?.idempotencyKey || '');
    const payload = req.body?.payload || {};

    if (!type || !idempotencyKey) {
        return res.status(400).json({ error: 'Job type and idempotency key are required.' });
    }

    if (type !== 'roadmap_generation') {
        return res.status(400).json({ error: 'Invalid job type.' });
    }

    try {
        const { data: existing, error: existingError } = await scoped
            .from('jobs')
            .select('id, user_id, type, status, progress, idempotency_key, payload, result, error, created_at, updated_at')
            .eq('user_id', userId)
            .eq('type', type)
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();

        if (existingError) {
            console.error('[jobs] idempotency check failed:', existingError);
            return res.status(500).json({ error: 'Failed to check for existing job.' });
        }

        if (existing) {
            return res.status(200).json({ job: existing as JobRow, reused: true });
        }

        const insertPayload = {
            user_id: userId,
            type,
            status: 'pending' as JobStatus,
            progress: 0,
            idempotency_key: idempotencyKey,
            payload,
            result: null,
            error: null,
        };

        const { data: created, error: createError } = await scoped
            .from('jobs')
            .insert(insertPayload)
            .select('id, user_id, type, status, progress, idempotency_key, payload, result, error, created_at, updated_at')
            .single();

        if (createError || !created) {
            console.error('[jobs] create failed:', createError);
            return res.status(500).json({ error: 'Failed to create roadmap job. Please try again.' });
        }

        return res.status(201).json({ job: created as JobRow, reused: false });
    } catch (err: any) {
        console.error('[jobs] create exception:', err);
        return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
}

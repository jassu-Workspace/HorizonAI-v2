import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1';

const MODEL = 'meta/llama-3.1-405b-instruct';

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
};

const pickApiKey = (): string => {
    return (
        String(process.env.NVIDIA_API_KEY_2 || '').trim() ||
        String(process.env.NVIDIA_API_KEY_1 || '').trim() ||
        String(process.env.NVIDIA_API_KEY_3 || '').trim() ||
        String(process.env.NVIDIA_API_KEY || '').trim()
    );
};

const parseJsonResponse = <T,>(text: string): T => {
    const trimmed = text.trim();
    const jsonText = trimmed.replace(/^```json\s*|```\s*$/g, '').replace(/^```\s*|```\s*$/g, '');
    return JSON.parse(jsonText) as T;
};

const updateJob = async (client: any, jobId: string, patch: Record<string, unknown>) => {
    await client
        .from('jobs')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', jobId);
};

const generateRoadmap = async (payload: any): Promise<Record<string, unknown>> => {
    const apiKey = pickApiKey();
    if (!apiKey) {
        throw new Error('AI provider unavailable');
    }

    const skill = String(payload?.skill || '').trim();
    const weeks = String(payload?.weeks || '8').trim();
    const level = String(payload?.level || 'Beginner').trim();
    const profile = payload?.profile || {};

    if (!skill) {
        throw new Error('Missing skill');
    }

    const prompt = `You are a career roadmap generator.\nCreate a valid JSON roadmap with this schema:\n{\n  "skill": "${skill}",\n  "roadmap": [{"week":1,"theme":"...","goals":["..."],"resources":[{"title":"...","searchQuery":"..."}]}],\n  "freePlatforms":[{"name":"...","description":"...","searchQuery":"..."}],\n  "paidPlatforms":[{"name":"...","description":"...","searchQuery":"..."}],\n  "books":[{"name":"...","description":"...","searchQuery":"..."}]\n}\nConstraints:\n- Duration: ${weeks} weeks\n- Skill level: ${level}\n- User context: ${JSON.stringify(profile).slice(0, 4000)}\nOnly return JSON.`;

    const client = new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
    const completion = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        top_p: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
    });

    const content = String(completion.choices?.[0]?.message?.content || '');
    const parsed = parseJsonResponse<Record<string, unknown>>(content);

    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).roadmap)) {
        throw new Error('Malformed roadmap response');
    }

    return parsed;
};

export default async function handler(req: any, res: any) {
    setSecurityHeaders(res);

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const token = getAuthToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const authClient = getAuthClient();
    if (!authClient) {
        return res.status(503).json({ error: 'Service unavailable' });
    }

    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const scoped = getUserScopedClient(token);
    if (!scoped) {
        return res.status(503).json({ error: 'Service unavailable' });
    }

    const userId = authData.user.id;

    if (req.method === 'GET') {
        const jobId = String(req.query?.id || '').trim();
        if (jobId) {
            const { data, error } = await scoped
                .from('jobs')
                .select('id, user_id, type, status, progress, idempotency_key, payload, result, error, created_at, updated_at')
                .eq('id', jobId)
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                return res.status(500).json({ error: 'Failed to fetch job' });
            }

            if (!data) {
                return res.status(404).json({ error: 'Job not found' });
            }

            return res.status(200).json({ job: data });
        }

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
            return res.status(500).json({ error: 'Failed to load jobs' });
        }

        return res.status(200).json({ jobs: (data || []) as JobRow[] });
    }

    const action = String(req.query?.action || req.body?.action || '').trim().toLowerCase();
    if (action === 'run') {
        const jobId = String(req.body?.id || req.query?.id || '').trim();
        if (!jobId) {
            return res.status(400).json({ error: 'id is required' });
        }

        const { data: job, error: jobError } = await scoped
            .from('jobs')
            .select('id, user_id, type, status, progress, payload, result')
            .eq('id', jobId)
            .eq('user_id', userId)
            .maybeSingle();

        if (jobError) {
            return res.status(500).json({ error: 'Failed to fetch job' });
        }

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
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
                throw new Error('Unsupported job type');
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
            await updateJob(scoped, jobId, {
                status: 'failed' as JobStatus,
                progress: 100,
                error: String(error?.message || 'Job failed'),
            });

            return res.status(500).json({ error: 'Job execution failed' });
        }
    }

    const type = String(req.body?.type || '');
    const idempotencyKey = String(req.body?.idempotencyKey || '');
    const payload = req.body?.payload || {};

    if (!type || !idempotencyKey) {
        return res.status(400).json({ error: 'type and idempotencyKey are required' });
    }

    const { data: existing, error: existingError } = await scoped
        .from('jobs')
        .select('id, user_id, type, status, progress, idempotency_key, payload, result, error, created_at, updated_at')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

    if (existingError) {
        return res.status(500).json({ error: 'Failed to evaluate idempotency' });
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
        return res.status(500).json({ error: 'Failed to create job' });
    }

    return res.status(201).json({ job: created as JobRow, reused: false });
}

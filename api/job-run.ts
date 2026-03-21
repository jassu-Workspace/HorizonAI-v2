import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1';

const MODEL = 'meta/llama-3.1-405b-instruct';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

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
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const token = getAuthToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const authClient = getAuthClient();
    const scoped = getUserScopedClient(token);
    if (!authClient || !scoped) {
        return res.status(503).json({ error: 'Service unavailable' });
    }

    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const jobId = String(req.body?.id || req.query?.id || '');
    if (!jobId) {
        return res.status(400).json({ error: 'id is required' });
    }

    const { data: job, error: jobError } = await scoped
        .from('jobs')
        .select('id, user_id, type, status, progress, payload, result')
        .eq('id', jobId)
        .eq('user_id', authData.user.id)
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

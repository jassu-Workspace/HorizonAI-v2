import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

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

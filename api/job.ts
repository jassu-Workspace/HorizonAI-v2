import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

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

export default async function handler(req: any, res: any) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method !== 'GET') {
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

    const jobId = String(req.query?.id || '');
    if (!jobId) {
        return res.status(400).json({ error: 'id is required' });
    }

    const { data, error } = await scoped
        .from('jobs')
        .select('id, user_id, type, status, progress, idempotency_key, payload, result, error, created_at, updated_at')
        .eq('id', jobId)
        .eq('user_id', authData.user.id)
        .maybeSingle();

    if (error) {
        return res.status(500).json({ error: 'Failed to fetch job' });
    }

    if (!data) {
        return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json({ job: data });
}

const NEWS_API_BASE = 'https://newsdata.io/api/1/latest';
const PRIMARY_NEWS_KEY = (process.env.NEWSDATA_API_KEY || '').trim();
const BACKUP_NEWS_KEY = (process.env.NEWSDATA_API_KEY_BACKUP || '').trim();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const ipRateWindow = new Map<string, { count: number; resetAt: number }>();
const MAX_NEWS_REQ_PER_5_MIN_IP = Number(process.env.NEWS_RL_IP_5M || 50);

const getClientIp = (req: any): string => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0].trim();
    }
    return String(req.socket?.remoteAddress || 'unknown');
};

const checkSlidingWindow = (
    map: Map<string, { count: number; resetAt: number }>,
    key: string,
    limit: number,
    windowMs: number,
): { allowed: boolean; resetAt: number } => {
    const now = Date.now();
    const current = map.get(key);

    if (!current || current.resetAt <= now) {
        map.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, resetAt: now + windowMs };
    }

    current.count += 1;
    map.set(key, current);

    if (current.count > limit) {
        return { allowed: false, resetAt: current.resetAt };
    }

    return { allowed: true, resetAt: current.resetAt };
};

const setCorsHeaders = (req: any, res: any) => {
    const requestOrigin = String(req.headers.origin || '');
    const allowAll = ALLOWED_ORIGINS.length === 0;
    const isAllowed = allowAll || ALLOWED_ORIGINS.includes(requestOrigin);

    if (isAllowed && requestOrigin) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    return isAllowed;
};

export default async function handler(req: any, res: any) {
    const corsAllowed = setCorsHeaders(req, res);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (!corsAllowed && req.headers.origin) {
        return res.status(403).json({ error: 'Origin not allowed' });
    }

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const ip = getClientIp(req);
    const ipWindow = checkSlidingWindow(ipRateWindow, ip, MAX_NEWS_REQ_PER_5_MIN_IP, 5 * 60 * 1000);
    if (!ipWindow.allowed) {
        return res.status(429).json({ error: 'Too many requests', retryAfterMs: Math.max(0, ipWindow.resetAt - Date.now()) });
    }

    const topic = String(req.query?.topic || '').trim().slice(0, 120);
    const query = topic ? `&q=${encodeURIComponent(topic)}` : '&prioritydomain=top';

    const keys = [PRIMARY_NEWS_KEY, BACKUP_NEWS_KEY].filter(Boolean);
    if (keys.length === 0) {
        return res.status(503).json({ error: 'News service unavailable' });
    }

    for (const apiKey of keys) {
        try {
            const response = await fetch(`${NEWS_API_BASE}?apikey=${apiKey}&country=in&category=education${query}`);
            if (!response.ok) {
                if (response.status === 429) continue;
                continue;
            }

            const body = await response.json();
            const results = Array.isArray(body?.results) ? body.results : [];

            const sanitized = results
                .map((item: any, index: number) => {
                    const link = /^https?:\/\//i.test(String(item?.link || '')) ? String(item.link) : '';
                    return {
                        article_id: String(item?.article_id || `${Date.now()}-${index}`),
                        title: String(item?.title || 'Untitled news'),
                        link,
                        description: item?.description ? String(item.description) : undefined,
                        pubDate: String(item?.pubDate || new Date().toISOString()),
                        image_url: item?.image_url ? String(item.image_url) : undefined,
                        source_id: String(item?.source_id || 'news'),
                    };
                })
                .filter((item: any) => Boolean(item.link))
                .slice(0, 5);

            return res.status(200).json({ results: sanitized });
        } catch {
            continue;
        }
    }

    return res.status(502).json({ error: 'Upstream news provider unavailable' });
}

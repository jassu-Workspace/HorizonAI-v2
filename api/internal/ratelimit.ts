import { checkMultiLevelRateLimit, updateAbuseScore, initRedis } from '../redis-ratelimit';
import { verifyInternalRequest } from '../internal-auth';

const MAX_REQUESTS_PER_5_MIN_IP = Number(process.env.AI_RL_IP_5M || 40);
const MAX_REQUESTS_PER_5_MIN_USER = Number(process.env.AI_RL_USER_5M || 30);
const MAX_REQUESTS_PER_5_MIN_DEVICE = Number(process.env.AI_RL_DEVICE_5M || 25);

const setSecurityHeaders = (res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
};

export default async function handler(req: any, res: any) {
    setSecurityHeaders(res);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!verifyInternalRequest(req, 'POST', '/api/internal/ratelimit')) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const ip = String(req.body?.ip || 'unknown');
    const userId = String(req.body?.userId || '');
    const deviceFingerprint = String(req.body?.deviceFingerprint || '');

    if (!userId || !deviceFingerprint) {
        return res.status(400).json({ error: 'Invalid internal payload' });
    }

    await initRedis();

    const rlCheck = await checkMultiLevelRateLimit(
        ip,
        userId,
        deviceFingerprint,
        MAX_REQUESTS_PER_5_MIN_IP,
        MAX_REQUESTS_PER_5_MIN_USER,
        MAX_REQUESTS_PER_5_MIN_DEVICE,
    );

    if (!rlCheck.combined) {
        await updateAbuseScore(userId, 10);
    }

    return res.status(200).json(rlCheck);
}

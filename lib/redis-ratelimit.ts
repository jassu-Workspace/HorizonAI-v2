/**
 * Distributed Rate Limiting via Redis/Upstash (with in-memory fallback)
 * 
 * Strategy:
 *  - If Redis is configured → distributed sliding window (safe across Vercel instances)
 *  - If Redis is NOT configured → in-memory sliding window (works for single instances)
 *    This prevents the old "fail-secure = deny all" behaviour that caused HTTP 500 errors.
 */

import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
let isInitialized = false;
let redisAvailable = false;

const ABUSE_SCORE_THROTTLE_THRESHOLD = Number(process.env.AI_ABUSE_SCORE_THROTTLE || 50);
const ABUSE_SCORE_BLOCK_THRESHOLD = Number(process.env.AI_ABUSE_SCORE_BLOCK || 70);
const ABUSE_SCORE_BAN_THRESHOLD = Number(process.env.AI_ABUSE_SCORE_BAN || 90);

// ─── In-Memory Fallback ──────────────────────────────────────────────────────
// Stores timestamps of recent requests per key (sliding window)
const inMemoryWindows = new Map<string, number[]>();

const inMemoryRateLimit = (
    key: string,
    limit: number,
    windowMs: number,
): RateLimitResult => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (inMemoryWindows.get(key) || []).filter(t => t > windowStart);

    if (timestamps.length < limit) {
        timestamps.push(now);
        inMemoryWindows.set(key, timestamps);
        const oldest = timestamps[0] || now;
        return {
            allowed: true,
            remaining: limit - timestamps.length,
            resetAt: oldest + windowMs,
        };
    }

    const oldest = timestamps[0] || now;
    const retryAfter = Math.max(0, oldest + windowMs - now);

    return {
        allowed: false,
        remaining: 0,
        resetAt: oldest + windowMs,
        retryAfter,
    };
};

// Prune old in-memory entries every 5 minutes to prevent memory leaks
const pruneTimer = setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000; // 10 min ago
    for (const [key, timestamps] of inMemoryWindows.entries()) {
        const fresh = timestamps.filter(t => t > cutoff);
        if (fresh.length === 0) {
            inMemoryWindows.delete(key);
        } else {
            inMemoryWindows.set(key, fresh);
        }
    }
}, 5 * 60 * 1000);

// Avoid pinning Node's event loop in serverless execution environments.
if (typeof (pruneTimer as any).unref === 'function') {
    (pruneTimer as any).unref();
}

// ─── In-Memory Abuse Scores ──────────────────────────────────────────────────
const inMemoryAbuseScores = new Map<string, { score: number; date: string }>();

// ─── Redis Initialization ─────────────────────────────────────────────────────
export const initRedis = async (): Promise<RedisClient | null> => {
    if (isInitialized) {
        return redisClient;
    }

    try {
        const redisHost =
            String(process.env.REDIS_HOST || '').trim() ||
            String(process.env.UPSTASH_REDIS_HOST || '').trim();
        const redisToken =
            String(process.env.REDIS_RATE_LIMIT_TOKEN || '').trim() ||
            String(process.env.UPSTASH_REDIS_TOKEN || '').trim();
        const redisUrl = String(process.env.REDIS_URL || '').trim();

        if (!redisHost && !redisToken && !redisUrl) {
            // Redis not configured — use in-memory fallback (single instance safe)
            console.info('[redis] Not configured; using in-memory rate limit fallback.');
            isInitialized = true;
            redisAvailable = false;
            return null;
        }

        const connectionUrl = redisUrl || `rediss://default:${encodeURIComponent(redisToken)}@${redisHost}:6379`;

        redisClient = createClient({
            url: connectionUrl,
            socket: {
                reconnectStrategy: (retries) => Math.min(retries * 50, 500),
                connectTimeout: 3000,
            },
        });

        redisClient.on('error', (err) => {
            console.error('[redis] Connection error:', err.message);
            redisAvailable = false;
        });

        await redisClient.connect();
        console.log('[redis] Connected to Upstash/Redis');
        redisAvailable = true;
        isInitialized = true;
        return redisClient;
    } catch (error) {
        console.error('[redis] Initialization failed; falling back to in-memory:', error);
        isInitialized = true;
        redisAvailable = false;
        return null;
    }
};

export const getRedisClient = async (): Promise<RedisClient | null> => {
    if (!isInitialized) {
        return initRedis();
    }
    return redisClient;
};

// ─── Rate Limit Result ───────────────────────────────────────────────────────
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
}

// ─── Distributed / Fallback Sliding Window ────────────────────────────────────
export const checkDistributedRateLimit = async (
    key: string,
    limit: number,
    windowMs: number = 5 * 60 * 1000,
    _labels: Record<string, unknown> = {},
): Promise<RateLimitResult> => {
    const client = await getRedisClient();

    if (!client || !redisAvailable) {
        // In-memory fallback — safe for single-instance Vercel functions
        return inMemoryRateLimit(`rl:${key}`, limit, windowMs);
    }

    try {
        const now = Date.now();
        const windowStart = now - windowMs;
        const bucket = `rl:${key}`;

        const luaScript = `
            local bucket = KEYS[1]
            local now = tonumber(ARGV[1])
            local window_start = tonumber(ARGV[2])
            local limit = tonumber(ARGV[3])
            local window_ms = tonumber(ARGV[4])
            
            redis.call('ZREMRANGEBYSCORE', bucket, 0, window_start)
            local current = redis.call('ZCARD', bucket)
            
            if current < limit then
                redis.call('ZADD', bucket, now, now .. '-' .. math.random(1000000))
                redis.call('EXPIRE', bucket, math.ceil(window_ms / 1000))
                return { 1, limit - current - 1, now + window_ms }
            else
                return { 0, 0, now + window_ms }
            end
        `;

        const result = await client.eval(luaScript, {
            keys: [bucket],
            arguments: [String(now), String(windowStart), String(limit), String(windowMs)],
        });

        if (Array.isArray(result) && result.length === 3) {
            const [allowed, remaining, resetAt] = result as [0 | 1, number, number];
            return {
                allowed: allowed === 1,
                remaining: Math.max(0, remaining),
                resetAt: Number(resetAt),
                retryAfter: allowed === 0 ? windowMs : undefined,
            };
        }

        // Unexpected Redis response — fail open
        return { allowed: true, remaining: 5, resetAt: Date.now() + windowMs };
    } catch (error) {
        console.error('[ratelimit] Redis error, falling back to in-memory:', error);
        redisAvailable = false;
        return inMemoryRateLimit(`rl:${key}`, limit, windowMs);
    }
};

// ─── Multi-Level Rate Limit ───────────────────────────────────────────────────
export interface RateLimitCheckMulti {
    ip: RateLimitResult;
    user: RateLimitResult;
    device: RateLimitResult;
    combined: boolean;
}

export const checkMultiLevelRateLimit = async (
    ip: string,
    userId: string,
    deviceFingerprint: string,
    ipLimit: number = 40,
    userLimit: number = 30,
    deviceLimit: number = 25,
    windowMs: number = 5 * 60 * 1000,
): Promise<RateLimitCheckMulti> => {
    const [ipResult, userResult, deviceResult] = await Promise.all([
        checkDistributedRateLimit(`ip:${ip}`, ipLimit, windowMs, { type: 'ip' }),
        checkDistributedRateLimit(`user:${userId}`, userLimit, windowMs, { type: 'user' }),
        checkDistributedRateLimit(`device:${deviceFingerprint}`, deviceLimit, windowMs, { type: 'device' }),
    ]);

    return {
        ip: ipResult,
        user: userResult,
        device: deviceResult,
        combined: ipResult.allowed && userResult.allowed && deviceResult.allowed,
    };
};

// ─── Daily Quota (Redis + In-Memory Fallback) ─────────────────────────────────
export const checkDailyQuota = async (
    userId: string,
    currentUsage: number,
    dailyQuota: number,
): Promise<{ allowed: boolean; remaining: number; resetsAt: string }> => {
    const client = await getRedisClient();
    const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    if (!client || !redisAvailable) {
        // Fail-open when Redis not configured — track via Supabase daily table
        return { allowed: currentUsage < dailyQuota, remaining: Math.max(0, dailyQuota - currentUsage), resetsAt: resetTime };
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const quotaKey = `quota:${userId}:${today}`;

        const luaScript = `
            local quota_key = KEYS[1]
            local usage = tonumber(ARGV[1])
            local daily_limit = tonumber(ARGV[2])
            
            local current = redis.call('GET', quota_key)
            current = current and tonumber(current) or 0
            
            if current + usage <= daily_limit then
                redis.call('INCRBY', quota_key, usage)
                redis.call('EXPIRE', quota_key, 86400)
                return { 1, daily_limit - (current + usage) }
            else
                return { 0, 0 }
            end
        `;

        const result = await client.eval(luaScript, {
            keys: [quotaKey],
            arguments: [String(currentUsage), String(dailyQuota)],
        });

        if (Array.isArray(result) && result.length === 2) {
            const [allowed, remaining] = result as [0 | 1, number];
            return { allowed: allowed === 1, remaining: Math.max(0, remaining), resetsAt: resetTime };
        }

        return { allowed: false, remaining: 0, resetsAt: resetTime };
    } catch (error) {
        console.error('[quota] Redis error:', error);
        return { allowed: currentUsage < dailyQuota, remaining: Math.max(0, dailyQuota - currentUsage), resetsAt: resetTime };
    }
};

// ─── Abuse Score Tracking ─────────────────────────────────────────────────────
export interface AbuseScoreCheckResult {
    score: number;
    action: 'allow' | 'throttle' | 'block' | 'ban';
    message?: string;
}

export const updateAbuseScore = async (
    userId: string,
    increment: number,
    maxScorePerDay: number = 100,
): Promise<AbuseScoreCheckResult> => {
    const client = await getRedisClient();

    const today = new Date().toISOString().slice(0, 10);

    if (!client || !redisAvailable) {
        // In-memory abuse tracking fallback
        const existing = inMemoryAbuseScores.get(userId);
        const prevScore = existing?.date === today ? (existing?.score || 0) : 0;
        const newScore = Math.min(prevScore + increment, maxScorePerDay);
        inMemoryAbuseScores.set(userId, { score: newScore, date: today });
        return buildAbuseResult(newScore);
    }

    try {
        const abuseKey = `abuse:${userId}:${today}`;

        const luaScript = `
            local abuse_key = KEYS[1]
            local increment = tonumber(ARGV[1])
            local max_score = tonumber(ARGV[2])
            
            local current = redis.call('GET', abuse_key)
            current = current and tonumber(current) or 0
            
            local new_score = math.min(current + increment, max_score)
            redis.call('SET', abuse_key, new_score)
            redis.call('EXPIRE', abuse_key, 86400)
            
            return new_score
        `;

        const score = await client.eval(luaScript, {
            keys: [abuseKey],
            arguments: [String(increment), String(maxScorePerDay)],
        });

        return buildAbuseResult(Number(score) || 0);
    } catch (error) {
        console.error('[abuse] Redis error:', error);
        return { score: 0, action: 'allow' };
    }
};

const buildAbuseResult = (numScore: number): AbuseScoreCheckResult => {
    let action: 'allow' | 'throttle' | 'block' | 'ban' = 'allow';
    let message: string | undefined;

    if (numScore >= ABUSE_SCORE_BAN_THRESHOLD) {
        action = 'ban';
        message = 'Your account has been flagged for abuse. Contact support.';
    } else if (numScore >= ABUSE_SCORE_BLOCK_THRESHOLD) {
        action = 'block';
        message = 'Rate-limited due to suspicious activity.';
    } else if (numScore >= ABUSE_SCORE_THROTTLE_THRESHOLD) {
        action = 'throttle';
        message = 'Request throttled due to abuse detection.';
    }

    return { score: numScore, action, message };
};

// ─── Cleanup ─────────────────────────────────────────────────────────────────
export const closeRedis = async () => {
    if (redisClient && isInitialized) {
        await redisClient.quit();
        redisClient = null;
        isInitialized = false;
        redisAvailable = false;
        console.log('[redis] Disconnected');
    }
};

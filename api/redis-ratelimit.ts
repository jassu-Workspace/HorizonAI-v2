/**
 * Distributed Rate Limiting via Redis/Upstash
 * Supports global consistency across multiple Vercel instances
 * Phase 2 Elite Hardening: Replaces in-memory rate limiter
 */

import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
let isInitialized = false;

/**
 * Initialize Redis connection (lazily, on first use)
 * Compatible with Upstash Redis (serverless)
 */
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

        if (!redisHost || !redisToken) {
            console.warn('[redis] REDIS_HOST or REDIS_RATE_LIMIT_TOKEN is missing; rate limiting will fail-secure');
            isInitialized = true;
            return null;
        }

        const redisUrl = `rediss://default:${encodeURIComponent(redisToken)}@${redisHost}:6379`;

        redisClient = createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => Math.min(retries * 50, 500),
            },
        });

        redisClient.on('error', (err) => {
            console.error('[redis] Connection error:', err.message);
        });

        await redisClient.connect();
        console.log('[redis] Connected to Upstash/Redis');
        isInitialized = true;
        return redisClient;
    } catch (error) {
        console.error('[redis] Initialization failed:', error);
        isInitialized = true;
        return null;
    }
};

/**
 * Get Redis client (initializes if needed)
 */
export const getRedisClient = async (): Promise<RedisClient | null> => {
    if (!isInitialized) {
        return initRedis();
    }
    return redisClient;
};

/**
 * Distributed sliding window rate limiter
 * CRITICAL: Prevents distributed IP rotation, burst attacks, cost-exhaustion
 */
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
}

export const checkDistributedRateLimit = async (
    key: string,
    limit: number,
    windowMs: number = 5 * 60 * 1000, // 5 minutes default
    labels: Record<string, unknown> = {},
): Promise<RateLimitResult> => {
    const client = await getRedisClient();

    if (!client) {
        // Fallback: if Redis unavailable, log and deny (fail-secure)
        console.warn('[ratelimit] Redis unavailable; denying request for', key, labels);
        return {
            allowed: false,
            remaining: 0,
            resetAt: Date.now() + windowMs,
            retryAfter: windowMs,
        };
    }

    try {
        const now = Date.now();
        const windowStart = now - windowMs;
        const bucket = `rl:${key}`;

        // Lua script: atomic sliding window + expiration
        const luaScript = `
            local bucket = KEYS[1]
            local now = tonumber(ARGV[1])
            local window_start = tonumber(ARGV[2])
            local limit = tonumber(ARGV[3])
            local window_ms = tonumber(ARGV[4])
            
            -- Remove old entries outside the window
            redis.call('ZREMRANGEBYSCORE', bucket, 0, window_start)
            
            -- Get current count
            local current = redis.call('ZCARD', bucket)
            
            if current < limit then
                -- Add new request
                redis.call('ZADD', bucket, now, now .. '-' .. math.random(1000000))
                redis.call('EXPIRE', bucket, math.ceil(window_ms / 1000))
                return { 1, limit - current - 1, now + window_ms }
            else
                -- Limit exceeded
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

        return {
            allowed: false,
            remaining: 0,
            resetAt: now + windowMs,
            retryAfter: windowMs,
        };
    } catch (error) {
        console.error('[ratelimit] Redis error:', error);
        // Fail-secure: deny on error
        return {
            allowed: false,
            remaining: 0,
            resetAt: Date.now() + windowMs,
            retryAfter: windowMs,
        };
    }
};

/**
 * Multi-level distributed rate limiting
 * Checks: IP, user, device fingerprint
 */
export interface RateLimitCheckMulti {
    ip: RateLimitResult;
    user: RateLimitResult;
    device: RateLimitResult;
    combined: boolean; // all three must pass
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

/**
 * Quota-style rate limiting (e.g., daily AI token budget)
 * Uses Redis sorted set to track daily usage windows
 */
export const checkDailyQuota = async (
    userId: string,
    currentUsage: number,
    dailyQota: number,
): Promise<{ allowed: boolean; remaining: number; resetsAt: string }> => {
    const client = await getRedisClient();

    if (!client) {
        console.warn('[quota] Redis unavailable; allowing request for', userId);
        return {
            allowed: true,
            remaining: dailyQota - currentUsage,
            resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const quotaKey = `quota:${userId}:${today}`;

        // Atomic increment and check
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
            arguments: [String(currentUsage), String(dailyQota)],
        });

        if (Array.isArray(result) && result.length === 2) {
            const [allowed, remaining] = result as [0 | 1, number];
            return {
                allowed: allowed === 1,
                remaining: Math.max(0, remaining),
                resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
        }

        return {
            allowed: false,
            remaining: 0,
            resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
    } catch (error) {
        console.error('[quota] Redis error:', error);
        return {
            allowed: false,
            remaining: 0,
            resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
    }
};

/**
 * Abuse scoring: track user behaviors, progressive penalties
 * Phases: normal → throttle → temporary-block → permanent-ban (via DB update)
 */
export interface AbuseScoreCheckResult {
    score: number; // 0-100
    action: 'allow' | 'throttle' | 'block' | 'ban';
    message?: string;
}

export const updateAbuseScore = async (
    userId: string,
    increment: number, // e.g., +5 for suspicious, +15 for rate-limit breach
    maxScorePerDay: number = 100,
): Promise<AbuseScoreCheckResult> => {
    const client = await getRedisClient();

    if (!client) {
        return {
            score: increment,
            action: 'allow',
        };
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
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

        const numScore = Number(score) || 0;

        // Determine action based on abuse score
        let action: 'allow' | 'throttle' | 'block' | 'ban' = 'allow';
        let message: string | undefined;

        if (numScore >= 90) {
            action = 'ban';
            message = 'Your account has been flagged for abuse. Contact support.';
        } else if (numScore >= 70) {
            action = 'block';
            message = 'Rate-limited due to suspicious activity.';
        } else if (numScore >= 50) {
            action = 'throttle';
            message = 'Request throttled due to abuse detection.';
        }

        return { score: numScore, action, message };
    } catch (error) {
        console.error('[abuse] Redis error:', error);
        return {
            score: 0,
            action: 'allow',
        };
    }
};

/**
 * Cleanup: gracefully close Redis on process exit
 */
export const closeRedis = async () => {
    if (redisClient && isInitialized) {
        await redisClient.quit();
        redisClient = null;
        isInitialized = false;
        console.log('[redis] Disconnected');
    }
};

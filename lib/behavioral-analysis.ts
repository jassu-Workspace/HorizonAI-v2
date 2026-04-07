/**
 * Behavioral Anti-Abuse Detection Module
 * Phase 2 Elite Hardening: Prompt similarity, cost-exhaustion patterns, jailbreak attempts
 * 
 * Implements: Levenshtein distance, n-gram analysis, cost-pattern detection
 */

export interface AbuseSignals {
    hasPromptInjection: boolean;
    hasJailbreakAttempt: boolean;
    hasHighUrlDensity: boolean;
    isExcessiveRepetition: boolean;
    isHighCostPrompt: boolean;
    isSimilarToPrevious: boolean;
    costExhaustionIndicators: number; // 0-10 score
    abuseScore: number; // 0-100
}

/**
 * Jailbreak pattern detection
 * Catches: DarkPrompt, HyperbolePrompt, DAN, STAN, etc.
 */
const JAILBREAK_PATTERNS = [
    /(?:ignore|forget|disregard).{0,20}(?:previous|prior|earlier|system).{0,20}(?:instruction|prompt|role)/i,
    /\bdeveloper mode\b/i,
    /\bignore all constraints\b/i,
    /\broleplay as\b.*(?:unrestricted|uncensored|evil|villain|hacker)/i,
    /\b(?:pretend|act as|imagine).{0,30}(?:have no rules|no restrictions|can do anything)/i,
    /^(?:DAN|STAN|AIM|UCAR|NIETZSCHE|MARIA)[\s:]/i,
    /\[SYSTEM.?OVERWRITE\]/i,
    /ALWAYS respond.*NEVER refuse/i,
];

const PROMPT_INJECTION_PATTERNS = [
    /(?:execute|run|do this|perform).{0,20}(?:code|command|script|sql)/i,
    /sql injection|xss payload|csrf token/i,
    /<!--.*?-->/,
    /```.*?```/s,
];

const COST_EXHAUSTION_KEYWORDS = [
    /\b(?:spam|flood|blast|drain|exhaust|loop|repeat|generate|mass produce)\b/i,
    /(?:write|generate|create|make).{0,20}(?:\d{3,}|very long|huge|massive|infinite).{0,20}(?:text|content|message|response)/i,
];

export const detectAbuseSignals = (
    messages: Array<{ role: string; content: string }>,
    previousPrompts: string[] = [],
): AbuseSignals => {
    const text = messages.map(m => m.content).join('\n');
    const totalLength = text.length;
    const messageCount = messages.length;

    // Individual signal checks
    const hasPromptInjection = PROMPT_INJECTION_PATTERNS.some(p => p.test(text));
    const hasJailbreakAttempt = JAILBREAK_PATTERNS.some(p => p.test(text));
    const hasHighUrlDensity = (text.match(/https?:\/\//g) || []).length > 5;
    const isExcessiveRepetition = /(.)\1{30,}/.test(text);
    const isHighCostPrompt = COST_EXHAUSTION_KEYWORDS.some(p => p.test(text));
    const isSimilarToPrevious = previousPrompts.length > 0 && checkPromptSimilarity(text, previousPrompts);

    // Calculate cost-exhaustion indicators (0-10)
    let costScore = 0;
    if (isHighCostPrompt) costScore += 4;
    if (totalLength > 8000) costScore += 2;
    if (messageCount > 15) costScore += 2;
    if (hasHighUrlDensity) costScore += 1;
    if (isSimilarToPrevious && messageCount > 1) costScore += 2;
    const costExhaustionIndicators = Math.min(costScore, 10);

    // Calculate overall abuse score (0-100)
    let abuseScore = 0;
    if (hasPromptInjection) abuseScore += 25;
    if (hasJailbreakAttempt) abuseScore += 30;
    if (hasHighUrlDensity) abuseScore += 15;
    if (isExcessiveRepetition) abuseScore += 20;
    if (isHighCostPrompt) abuseScore += 20;
    if (isSimilarToPrevious) abuseScore += 15;

    return {
        hasPromptInjection,
        hasJailbreakAttempt,
        hasHighUrlDensity,
        isExcessiveRepetition,
        isHighCostPrompt,
        isSimilarToPrevious,
        costExhaustionIndicators,
        abuseScore: Math.min(abuseScore, 100),
    };
};

/**
 * Levenshtein distance: detect nearly identical prompts
 * Used to catch: mass-generation with minimal variation, replay attacks
 */
export const levenshteinDistance = (a: string, b: string): number => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const matrix: number[][] = [];

    for (let i = 0; i <= bLower.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= aLower.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= bLower.length; i++) {
        for (let j = 1; j <= aLower.length; j++) {
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + (aLower[j - 1] === bLower[i - 1] ? 0 : 1),
            );
        }
    }

    return matrix[bLower.length][aLower.length];
};

/**
 * Calculate similarity ratio (0-1)
 */
export const calculateSimilarity = (a: string, b: string): number => {
    const distance = levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) {
        return 1;
    }
    return 1 - distance / maxLen;
};

/**
 * Check if prompt is suspiciously similar to previous ones
 * Flags threshold: >85% similarity
 */
export const checkPromptSimilarity = (current: string, previousPrompts: string[], threshold: number = 0.85): boolean => {
    return previousPrompts.some(prev => {
        const similarity = calculateSimilarity(current, prev);
        return similarity > threshold;
    });
};

/**
 * Cost pattern detection: flags rapid-fire high-token requests
 * Prevents: distributed token-drain via unique-looking but semantically identical prompts
 */
export interface CostPattern {
    avgTokensPerRequest: number;
    requestsPerMinute: number;
    totalTokensInWindow: number;
    isAbnormal: boolean;
}

export const analyzeCostPattern = (
    recentRequests: Array<{ timestamp: number; estimatedTokens: number }>,
    windowMinutes: number = 5,
    abnormalThreshold: number = 100_000, // 100K tokens in 5 min = $0.50+ spend
): CostPattern => {
    const now = Date.now();
    const windowStart = now - windowMinutes * 60 * 1000;

    const filtered = recentRequests.filter(r => r.timestamp >= windowStart);

    if (filtered.length === 0) {
        return {
            avgTokensPerRequest: 0,
            requestsPerMinute: 0,
            totalTokensInWindow: 0,
            isAbnormal: false,
        };
    }

    const totalTokens = filtered.reduce((sum, r) => sum + r.estimatedTokens, 0);
    const avgTokens = totalTokens / filtered.length;
    const requestsPerMinute = (filtered.length / windowMinutes) * 60;

    return {
        avgTokensPerRequest: avgTokens,
        requestsPerMinute,
        totalTokensInWindow: totalTokens,
        isAbnormal: totalTokens > abnormalThreshold,
    };
};

/**
 * Semantic similarity via n-gram analysis
 * Lighter weight alternative to full embedding models
 */
export const generateNGrams = (text: string, n: number = 3): Set<string> => {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ');
    const ngrams = new Set<string>();

    for (let i = 0; i <= normalized.length - n; i++) {
        ngrams.add(normalized.substring(i, i + n));
    }

    return ngrams;
};

export const ngramSimilarity = (a: string, b: string, n: number = 3): number => {
    const aGrams = generateNGrams(a, n);
    const bGrams = generateNGrams(b, n);

    const intersection = new Set([...aGrams].filter(g => bGrams.has(g)));
    const union = new Set([...aGrams, ...bGrams]);

    return intersection.size / (union.size || 1);
};

/**
 * Memory-efficient prompt history for abuse detection
 * Stores hash-compressed history to avoid OOM on large conversations
 */
export class PromptHistory {
    private history: Map<string, string[]> = new Map(); // userId -> normalized prompt signatures
    private maxHistoryPerUser: number = 50;

    addPrompt(userId: string, prompt: string): void {
        const signature = normalizePromptForHistory(prompt);
        if (!signature) {
            return;
        }

        const userHistory = this.history.get(userId) || [];

        // Avoid duplicates
        if (!userHistory.includes(signature)) {
            userHistory.push(signature);

            // Keep only recent N prompts
            if (userHistory.length > this.maxHistoryPerUser) {
                userHistory.shift();
            }

            this.history.set(userId, userHistory);
        }
    }

    getRecentPrompts(userId: string, count: number = 10): string[] {
        const userHistory = this.history.get(userId) || [];
        return userHistory.slice(-count);
    }

    clear(userId: string): void {
        this.history.delete(userId);
    }

    // Cleanup old entries if map grows too large
    cleanupIfNeeded(): void {
        if (this.history.size > 10000) {
            const iterator = this.history.entries();
            for (let i = 0; i < 1000; i++) {
                const next = iterator.next();
                if (next.done || !next.value) {
                    break;
                }
                this.history.delete(next.value[0]);
            }
        }
    }
}

const normalizePromptForHistory = (prompt: string): string => {
    return String(prompt || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1200);
};

export const promptHistory = new PromptHistory();

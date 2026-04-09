/**
 * API Proxy Server
 * Handles requests to NVIDIA API to avoid CORS issues
 * Runs on a dedicated backend port, Frontend calls this instead of NVIDIA directly
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 3004);

app.use(cors());
app.use(express.json());

type KeyState = {
    slot: number;
    key: string;
    label: string;
    cooldownUntil: number;
    failures: number;
    lastUsedAt: number;
};

const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1';
const RATE_LIMIT_COOLDOWN_MS = Number(process.env.NVIDIA_KEY_RATE_LIMIT_COOLDOWN_MS || 65000);
const ERROR_COOLDOWN_MS = Number(process.env.NVIDIA_KEY_ERROR_COOLDOWN_MS || 8000);
const MAX_RETRIES_PER_REQUEST = Number(process.env.NVIDIA_KEY_MAX_RETRIES || 6);

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

// Explicit model-to-key binding requested by product requirements.
const MODEL_TO_KEY_SLOT: Record<string, 1 | 2 | 3> = {
    'glm-4.7': 1,
    'z-ai/glm4.7': 1,
    'z.ai/glm4.7': 1,
    'z.ai glm 4.7': 1,
    'meta/llama-3.1-405b-instruct': 2,
    'mistralai/mistral-7b-instruct-v0.2': 3,
};

const normalizeModelName = (model: string): string => {
    const normalized = String(model || '').trim().toLowerCase();

    if (
        normalized === 'z-ai/glm4.7' ||
        normalized === 'z.ai/glm4.7' ||
        normalized === 'z.ai glm 4.7' ||
        normalized === 'glm-4.7'
    ) {
        return 'z-ai/glm4.7';
    }

    if (normalized === 'meta/llama-3.1-405b-instruct') {
        return 'meta/llama-3.1-405b-instruct';
    }

    if (normalized === 'mistralai/mistral-7b-instruct-v0.2') {
        return 'mistralai/mistral-7b-instruct-v0.2';
    }

    return model;
};

let roundRobinPointer = 0;

const isRateLimitError = (error: any): boolean => {
    const message = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || error?.code || 0);
    return status === 429 || message.includes('429') || message.includes('rate limit') || message.includes('too many requests');
};

const isNotFoundError = (error: any): boolean => {
    const message = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || error?.code || 0);
    return status === 404 || message.includes('404') || message.includes('not found');
};

const getAvailableKeys = (): KeyState[] => {
    const now = Date.now();
    return keyPool.filter(k => now >= k.cooldownUntil);
};

const pickNextKey = (forModel: string): KeyState | null => {
    const mappedSlot = MODEL_TO_KEY_SLOT[forModel];
    if (!mappedSlot) return null;

    const available = getAvailableKeys().filter(k => k.slot === mappedSlot);
    if (available.length === 0) return null;

    // Round-robin over all keys while skipping keys in cooldown.
    for (let i = 0; i < available.length; i++) {
        const idx = (roundRobinPointer + i) % available.length;
        const candidate = available[idx];
        if (Date.now() >= candidate.cooldownUntil) {
            roundRobinPointer = (idx + 1) % available.length;
            candidate.lastUsedAt = Date.now();
            return candidate;
        }
    }

    // Fallback to least recently used from available pool.
    return available.sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0] || null;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type RoadmapResource = {
    title: string;
    searchQuery: string;
};

type RoadmapWeek = {
    week: number;
    theme: string;
    goals: string[];
    resources: RoadmapResource[];
};

type RoadmapPlatform = {
    name: string;
    description: string;
    searchQuery: string;
};

type RoadmapPayload = {
    skill: string;
    roadmap: RoadmapWeek[];
    freePlatforms: RoadmapPlatform[];
    paidPlatforms: RoadmapPlatform[];
    books: RoadmapPlatform[];
};

const ROADMAP_PROVIDER_TIMEOUT_MS = Number(process.env.NVIDIA_ROADMAP_TIMEOUT_MS || 8000);
const ROADMAP_WEEK_MIN = 4;
const ROADMAP_WEEK_MAX = 16;

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseRecommendedWeeks = (value: unknown): number => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 12;
    }

    return clampNumber(parsed, ROADMAP_WEEK_MIN, ROADMAP_WEEK_MAX);
};

const buildFallbackRoadmap = ({
    profile,
    assessmentResult,
    selectedCareer,
}: {
    profile: any;
    assessmentResult: any;
    selectedCareer: string;
}): RoadmapPayload => {
    const skill = String(selectedCareer || assessmentResult?.skillName || profile?.skills || 'Learning Roadmap').trim();
    const totalWeeks = parseRecommendedWeeks(assessmentResult?.recommendedWeeks);
    const level = String(assessmentResult?.recommendedLevel || 'Beginner').toLowerCase();
    const focusArea = String(profile?.focusArea || 'general').toLowerCase();

    const themeTracks: Record<string, string[]> = {
        beginner: [
            'foundations and setup',
            'core concepts',
            'guided practice',
            'mini project',
            'review and reinforce',
            'portfolio starter',
        ],
        intermediate: [
            'workflow and tooling',
            'intermediate patterns',
            'feature build',
            'testing and debugging',
            'system thinking',
            'portfolio project',
        ],
        expert: [
            'advanced architecture',
            'optimization and scale',
            'real-world case study',
            'performance tuning',
            'leadership review',
            'capstone delivery',
        ],
    };

    const goalTracks: Record<string, string[]> = {
        beginner: [
            `Understand the essential ${skill} vocabulary and tools`,
            `Complete one guided practice task for ${skill}`,
            `Write a short summary of what you learned this week`,
        ],
        intermediate: [
            `Build a small feature or exercise using ${skill}`,
            `Test your work and fix one real bug`,
            `Compare two approaches and note the trade-offs`,
        ],
        expert: [
            `Design an end-to-end solution around ${skill}`,
            `Optimize one part of the workflow for quality or speed`,
            `Document decisions as if you were handing this to a team`,
        ],
    };

    const weekThemes = themeTracks[level] || themeTracks.beginner;
    const weekGoals = goalTracks[level] || goalTracks.beginner;

    const roadmap = Array.from({ length: totalWeeks }, (_, index) => {
        const weekNumber = index + 1;
        const phase = weekThemes[index % weekThemes.length];

        return {
            week: weekNumber,
            theme: `${skill} - ${phase}`,
            goals: [
                `${weekGoals[0]}${focusArea ? ` with a ${focusArea} focus` : ''}`,
                weekNumber === totalWeeks
                    ? `Ship a final checkpoint or capstone for ${skill}`
                    : weekGoals[1],
                weekNumber <= 2
                    ? `Capture the top 3 concepts you need to remember`
                    : weekGoals[2],
            ],
            resources: [
                {
                    title: `Official ${skill} documentation`,
                    searchQuery: `${skill} official documentation`,
                },
                {
                    title: `${skill} hands-on project tutorial`,
                    searchQuery: `${skill} project tutorial`,
                },
            ],
        };
    });

    return {
        skill,
        roadmap,
        freePlatforms: [
            {
                name: 'Official documentation',
                description: 'Primary reference for concepts, setup, and examples.',
                searchQuery: `${skill} official documentation`,
            },
            {
                name: 'Video walkthroughs',
                description: 'Quick explanations and visual demonstrations.',
                searchQuery: `${skill} tutorial`,
            },
            {
                name: 'Community forums',
                description: 'Useful for debugging and seeing how others solve problems.',
                searchQuery: `${skill} community forum`,
            },
        ],
        paidPlatforms: [
            {
                name: 'Structured course platform',
                description: 'A guided, project-based course path with exercises.',
                searchQuery: `${skill} course`,
            },
            {
                name: 'Advanced specialization track',
                description: 'Deeper training for real-world application and portfolio work.',
                searchQuery: `${skill} advanced course`,
            },
            {
                name: 'Mentored learning program',
                description: 'Personal feedback and accountability while learning faster.',
                searchQuery: `${skill} mentorship`,
            },
        ],
        books: [
            {
                name: `${skill} handbook`,
                description: 'A broad reference to keep nearby while building projects.',
                searchQuery: `${skill} handbook`,
            },
            {
                name: `${skill} interview guide`,
                description: 'Preparation for common questions, terminology, and problem solving.',
                searchQuery: `${skill} interview guide`,
            },
            {
                name: 'Career project workbook',
                description: 'A practical workbook focused on shipping and reviewing work.',
                searchQuery: `${skill} project workbook`,
            },
        ],
    };
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    let timeoutHandle: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`Roadmap generation timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
};

const createClientForKey = (apiKey: string) => new OpenAI({
    apiKey,
    baseURL: NVIDIA_BASE_URL,
});

const summarizeKeyHealth = () => keyPool.map(k => ({
    label: k.label,
    inCooldown: Date.now() < k.cooldownUntil,
    failures: k.failures,
}));

const routeInfo = () => ({
    status: 'ok',
    message: 'API proxy server running',
    routes: {
        health: ['/health', '/api/health'],
        chat: ['/api/chat', '/chat'],
        roadmap: ['/api/ai/generate-roadmap', '/ai/generate-roadmap'],
    },
    keysConfigured: keyPool.length,
    keyHealth: summarizeKeyHealth(),
});

app.get('/', (req, res) => {
    res.json(routeInfo());
});

app.get('/api', (req, res) => {
    res.json(routeInfo());
});

// Health check
app.get(['/health', '/api/health'], (req, res) => {
    res.json(routeInfo());
});

// Chat completions proxy
app.post(['/api/chat', '/chat'], async (req, res) => {
    try {
        const { model, messages, temperature, top_p, max_tokens } = req.body;
        const requestedModel = normalizeModelName(model);

        if (!model || !messages) {
            return res.status(400).json({ error: 'Missing required fields: model, messages' });
        }

        if (!MODEL_TO_KEY_SLOT[requestedModel]) {
            return res.status(400).json({
                error: `Unsupported model '${model}'. Allowed models: z-ai/glm4.7, meta/llama-3.1-405b-instruct, mistralai/mistral-7b-instruct-v0.2`,
            });
        }

        if (keyPool.length === 0) {
            console.error('Missing NVIDIA API keys. Configure NVIDIA_API_KEYS or NVIDIA_API_KEY_1..3');
            return res.status(500).json({ error: 'NVIDIA API keys not configured on server' });
        }

        let lastError: any = null;
        const maxAttempts = Math.max(1, MAX_RETRIES_PER_REQUEST);

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const keyState = pickNextKey(requestedModel);

            if (!keyState) {
                const soonest = Math.min(...keyPool.map(k => k.cooldownUntil));
                const waitMs = Math.max(300, soonest - Date.now());
                await wait(waitMs);
                continue;
            }

            try {
                const client = createClientForKey(keyState.key);
                const completion = await client.chat.completions.create({
                    model: requestedModel,
                    messages,
                    temperature: temperature || 0.3,
                    top_p: top_p || 0.7,
                    max_tokens: max_tokens || 4096,
                    response_format: { type: 'json_object' }
                });

                keyState.failures = 0;
                keyState.cooldownUntil = 0;
                return res.json(completion);
            } catch (error: any) {
                // Provider-side fallback when requested GLM model id is unavailable.
                if (requestedModel === 'z-ai/glm4.7' && isNotFoundError(error)) {
                    try {
                        const fallbackModel = 'meta/llama-3.1-405b-instruct';
                        const fallbackKeyState = pickNextKey(fallbackModel);
                        if (fallbackKeyState) {
                            const fallbackClient = createClientForKey(fallbackKeyState.key);
                            const completion = await fallbackClient.chat.completions.create({
                                model: fallbackModel,
                                messages,
                                temperature: temperature || 0.3,
                                top_p: top_p || 0.7,
                                max_tokens: max_tokens || 4096,
                                response_format: { type: 'json_object' }
                            });

                            fallbackKeyState.failures = 0;
                            fallbackKeyState.cooldownUntil = 0;
                            return res.json(completion);
                        }
                    } catch (fallbackError: any) {
                        lastError = fallbackError;
                    }
                }

                lastError = error;
                keyState.failures += 1;

                const errorMessage = String(error?.message || '').toLowerCase();

                if (errorMessage.includes('timed out')) {
                    break;
                }

                if (isRateLimitError(error)) {
                    keyState.cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
                } else {
                    keyState.cooldownUntil = Date.now() + ERROR_COOLDOWN_MS;
                }
            }
        }

        const errorMessage = lastError?.message || 'All NVIDIA API keys failed for this request.';
        return res.status(503).json({
            error: errorMessage,
            details: `Mapped key for model '${requestedModel}' is exhausted or cooling down. Retry shortly.`,
            keyHealth: summarizeKeyHealth(),
        });
    } catch (error: any) {
        console.error('API Error:', error.message);
        res.status(500).json({
            error: error.message || 'API request failed',
            details: error.error?.message || ''
        });
    }
});

app.post(['/api/ai/generate-roadmap', '/ai/generate-roadmap'], async (req, res) => {
    try {
        const { profile, assessmentResult, selectedCareer, model } = req.body || {};
        const requestedModel = normalizeModelName(model || 'z-ai/glm4.7');
        const fallbackModel = 'meta/llama-3.1-405b-instruct';

        if (!profile || !assessmentResult || !selectedCareer) {
            return res.status(400).json({ error: 'Missing required fields: profile, assessmentResult, selectedCareer' });
        }

        const prompt = `You are generating a personalized learning roadmap in strict JSON only.

User profile:
${JSON.stringify(profile, null, 2)}

Assessment result:
${JSON.stringify(assessmentResult, null, 2)}

Selected career / skill:
${selectedCareer}

Return JSON with exactly this structure:
{
  "skill": "${selectedCareer}",
  "roadmap": [
    {
      "week": 1,
      "theme": "...",
      "goals": ["...", "...", "..."],
      "resources": [
        {"title": "...", "searchQuery": "..."},
        {"title": "...", "searchQuery": "..."}
      ]
    }
  ],
  "freePlatforms": [
    {"name": "...", "description": "...", "searchQuery": "..."}
  ],
  "paidPlatforms": [
    {"name": "...", "description": "...", "searchQuery": "..."}
  ],
  "books": [
    {"name": "...", "description": "...", "searchQuery": "..."}
  ]
}

Rules:
- Match the roadmap difficulty to the assessment level.
- Use realistic milestones and practical resources.
- Keep the JSON valid and do not wrap it in markdown.
- Include 3 to 5 weeks only if the assessment recommends a short plan; otherwise include the recommended number of weeks.
`;

        const candidateModels = [requestedModel, requestedModel === fallbackModel ? 'z-ai/glm4.7' : fallbackModel];
        let lastError: any = null;

        for (const candidateModel of candidateModels) {
            const keyState = pickNextKey(candidateModel);

            if (!keyState) {
                continue;
            }

            try {
                const client = createClientForKey(keyState.key);
                const completion = await withTimeout(client.chat.completions.create({
                    model: candidateModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    top_p: 0.7,
                    max_tokens: 3072,
                    response_format: { type: 'json_object' },
                }), ROADMAP_PROVIDER_TIMEOUT_MS);

                keyState.failures = 0;
                keyState.cooldownUntil = 0;

                const rawContent = completion.choices[0]?.message?.content || '{}';
                const parsed = JSON.parse(rawContent);

                return res.status(200).json({
                    skill: parsed.skill || selectedCareer,
                    roadmap: Array.isArray(parsed.roadmap) ? parsed.roadmap : [],
                    freePlatforms: Array.isArray(parsed.freePlatforms) ? parsed.freePlatforms : [],
                    paidPlatforms: Array.isArray(parsed.paidPlatforms) ? parsed.paidPlatforms : [],
                    books: Array.isArray(parsed.books) ? parsed.books : [],
                });
            } catch (error: any) {
                lastError = error;
                keyState.failures += 1;

                if (isRateLimitError(error)) {
                    keyState.cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
                } else {
                    keyState.cooldownUntil = Date.now() + ERROR_COOLDOWN_MS;
                }

                if (candidateModel === requestedModel && isNotFoundError(error)) {
                    continue;
                }
            }
        }

        const fallbackRoadmap = buildFallbackRoadmap({ profile, assessmentResult, selectedCareer });
        return res.status(200).json({
            ...fallbackRoadmap,
            fallback: true,
            warning: lastError?.message || 'Roadmap generation fell back to a local template.',
        });
    } catch (error: any) {
        const fallbackRoadmap = buildFallbackRoadmap({
            profile: req.body?.profile,
            assessmentResult: req.body?.assessmentResult,
            selectedCareer: req.body?.selectedCareer || 'Learning Roadmap',
        });

        return res.status(200).json({
            ...fallbackRoadmap,
            fallback: true,
            warning: error?.message || 'Roadmap generation fell back to a local template.',
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ API Proxy Server running on http://localhost:${PORT}`);
    console.log(`📡 NVIDIA API KEYS: ${keyPool.length > 0 ? `${keyPool.length} configured` : 'MISSING'}`);
    console.log(`🌐 NVIDIA API BASE: ${NVIDIA_BASE_URL}`);
    console.log(`♻️ Key Rotation: RR enabled | 429 cooldown=${RATE_LIMIT_COOLDOWN_MS}ms | error cooldown=${ERROR_COOLDOWN_MS}ms`);
});

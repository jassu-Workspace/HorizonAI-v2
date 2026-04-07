import { UserProfile, Suggestion, RoadmapData, QuizQuestion, RapidQuestion, Flashcard, Project, Toughness, JobTrendData, AcademicSuggestion, TimelineEvent, OfflineCenter, Career, StudyPlanItem, SetupStep, RealWorldScenario, ConceptConnection, Debate, CareerRecommendation, RoadmapWeek, ProjectDetails, CareerDetails, MockInterview, FocusArea, ResumeAnalysis } from '../types';
import { supabase } from './supabaseService';

/**
 * NVIDIA BUILD API SERVICE (via Local Proxy)
 * =========================================
 * Frontend calls local API proxy (default: http://localhost:3004)
 * Backend proxy calls NVIDIA API (server-to-server, no CORS)
 * This avoids browser CORS restrictions
 */

// API Proxy Server URL
// In development, force AI requests through the backend proxy on port 3004.
const configuredApiBase = String(import.meta.env.VITE_API_PROXY_BASE || '').trim();
const normalizeApiBase = (base: string) => base.replace(/\/+$/, '');
const isDev = Boolean(import.meta.env.DEV);
const configuredPortMatch = configuredApiBase.match(/:(\d+)(?:\/|$)/);
const configuredPort = configuredPortMatch ? Number(configuredPortMatch[1]) : null;

const buildDevApiCandidates = (): string[] => {
  const candidates = [
    `http://${window.location.hostname}:3004/api`,
    'http://localhost:3004/api',
    'http://127.0.0.1:3004/api',
  ];

  // Only trust configured dev base when it points to the backend proxy port.
  if (configuredApiBase && configuredPort === 3004) {
    candidates.unshift(configuredApiBase);
  }

  return Array.from(new Set(candidates.map(normalizeApiBase)));
};

const buildProdApiCandidates = (): string[] => {
  const candidates = [
    configuredApiBase,
    `${window.location.origin}/api`,
    '/api',
  ].filter(Boolean) as string[];

  return Array.from(new Set(candidates.map(normalizeApiBase)));
};

const API_BASE_CANDIDATES = isDev ? buildDevApiCandidates() : buildProdApiCandidates();

type ApiRequestError = Error & { status?: number; code?: string; rawMessage?: string };
type CallApiOptions = {
  timeoutMs?: number;
  maxTokens?: number;
};

/**
 * Make API calls through local proxy server with robust retry logic
 */
const callNvidiaAPI = async (
    prompt: string,
    model: string = 'meta/llama-3.1-405b-instruct',
    temperature: number = 0.3,
  topP: number = 0.7,
  options?: CallApiOptions,
): Promise<string> => {   
  if (prompt.length > 12000) {
    throw new Error('Prompt is too large. Please reduce input size.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('Please sign in to use AI features.');
  }

    const requestToBase = async (apiBase: string): Promise<string> => {
      const controller = new AbortController();
      const requestedTimeout = Number(options?.timeoutMs || 30000);
      const requestDeadlineMs = Math.max(10000, Math.min(requestedTimeout, 60000));
      const requestedMaxTokens = Number(options?.maxTokens || 1024);
      const maxTokens = Math.max(64, Math.min(requestedMaxTokens, 4096));
      const timeoutId = window.setTimeout(() => controller.abort(), requestDeadlineMs);
      let response: Response;
      try {
        response = await fetch(`${apiBase}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            top_p: topP,
            max_tokens: maxTokens,
          }),
        });
      } catch (fetchErr: any) {
        window.clearTimeout(timeoutId);
        if (fetchErr?.name === 'AbortError') {
          const err: ApiRequestError = new Error('AI request timed out. Please try again.');
          err.code = 'REQUEST_TIMEOUT';
          throw err;
        }
        const err: ApiRequestError = new Error(fetchErr?.message || 'Network request failed. Check your internet connection.');
        err.code = 'NETWORK_ERROR';
        throw err;
      }

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const rawMessage = String(error.error || '');

        if (response.status === 404) {
          const err: ApiRequestError = new Error('AI endpoint not found');
          err.status = 404;
          err.code = 'ENDPOINT_NOT_FOUND';
          err.rawMessage = rawMessage;
          throw err;
        }

        if (model === 'z-ai/glm4.7' && (rawMessage.includes('404') || rawMessage.toLowerCase().includes('not found'))) {
          const err: ApiRequestError = new Error('Primary model unavailable');
          err.status = response.status;
          err.code = 'MODEL_NOT_FOUND';
          err.rawMessage = rawMessage;
          throw err;
        }

        let message: string;
        if (response.status === 401) {
          message = 'Your session has expired. Please sign in again.';
        } else if (response.status === 403) {
          message = 'Access denied. Please check your account permissions.';
        } else if (response.status === 429) {
          message = 'Too many requests. Please wait a moment and try again.';
        } else if (response.status === 503) {
          message = 'The AI service is temporarily unavailable. Please try again in a moment.';
        } else if (response.status >= 500) {
          message = rawMessage || 'An AI server error occurred. Please try again.';
        } else {
          message = rawMessage || `Request failed (${response.status}). Please try again.`;
        }

        const err: ApiRequestError = new Error(message);
        err.status = response.status;
        err.rawMessage = rawMessage;
        throw err;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      if (!content) {
        throw new Error('Empty response from AI model. Please try again.');
      }

      return content;
    };

    let retries = 2;
    let lastError: any = null;

    while (retries > 0) {
        try {
        return await Promise.any(API_BASE_CANDIDATES.map(apiBase => requestToBase(apiBase)));
        } catch (error: any) {
        const aggregateErrors = Array.isArray(error?.errors) ? error.errors : [error];
        const firstError = aggregateErrors[0] || error;
        lastError = firstError;
        const errorMsg = String(firstError?.message || '');

        const allEndpointsMissing = aggregateErrors.length > 0 && aggregateErrors.every((e: any) => e?.code === 'ENDPOINT_NOT_FOUND');
        if (allEndpointsMissing) {
          throw new Error('AI service endpoint is unavailable. Start the local backend proxy or verify deployment routes.');
        }

        const modelNotFound = aggregateErrors.find((e: any) => e?.code === 'MODEL_NOT_FOUND');
        if (model === 'z-ai/glm4.7' && modelNotFound) {
          console.warn('[AI] GLM model not found - falling back to Llama');
          return callNvidiaAPI(prompt, 'meta/llama-3.1-405b-instruct', temperature, topP, options);
        }

            if (errorMsg.includes('429') || errorMsg.includes('overloaded') || errorMsg.toLowerCase().includes('too many requests')) {
                retries--;
                if (retries > 0) {
            console.log(`[AI] Rate limited - retrying (${retries} attempts left)`);
            await new Promise(res => setTimeout(res, 250));
                    continue;
                }
            }

            // Don't retry on auth errors, abort errors, or non-retriable errors
            if (
                errorMsg.includes('sign in') ||
                errorMsg.includes('expired') ||
              firstError?.status === 401 ||
              firstError?.status === 403
            ) {
              throw firstError;
            }

            retries--;
            if (retries > 0) {
                console.warn(`[AI] Request failed - retrying (${retries} attempts left):`, errorMsg);
              await new Promise(res => setTimeout(res, 150));
                continue;
            }
        }
    }

    throw lastError || new Error('AI request failed after all retry attempts. Please try again later.');
};


/**
 * Parse JSON from text response, handling markdown code blocks and format variations
 */
const parseJsonResponse = <T,>(text: string): T => {
    try {
        const trimmed = text.trim();
        
        // Handle markdown code blocks (json, no language specified)
        let jsonText = trimmed
            .replace(/^```(?:json)?\s*\n?/i, '') // Remove opening fence
            .replace(/\n?```\s*$/i, '');           // Remove closing fence
        
        jsonText = jsonText.trim();
        
        if (!jsonText) {
            throw new Error("Empty response from API");
        }
        
        // Try parsing directly
        try {
            return JSON.parse(jsonText) as T;
        } catch (parseErr: any) {
            console.warn("[JSON Parse] Direct parse failed, attempting recovery", parseErr.message);
            
            // Try to recover partial JSON if it exists
            if (jsonText.includes('{')) {
                const jsonStart = jsonText.indexOf('{');
                const jsonEnd = jsonText.lastIndexOf('}');
                
                if (jsonStart >= 0 && jsonEnd > jsonStart) {
                    const extractedJson = jsonText.substring(jsonStart, jsonEnd + 1);
                    try {
                        return JSON.parse(extractedJson) as T;
                    } catch {
                        console.warn("[JSON Parse] Extracted JSON still invalid");
                    }
                }
            }
            
            throw parseErr;
        }
    } catch (e: any) {
        console.error("[JSON Parse] FATAL - Failed to parse JSON response:", text);
        console.error("[JSON Parse] Error:", e.message);
        throw new Error(`Invalid API response format: ${e.message}`);
    }
};

// Import from unified assessment service
import {
  ASSESSMENT_CONFIG,
  SELF_RATING_SENTINEL,
  buildCacheKey,
  validateAssessmentResponse,
  logAssessmentError,
  cloneQuestions,
} from './assessmentService';

type RapidAssessmentCacheEntry = {
  expiresAt: number;
  promise: Promise<RapidQuestion[]>;
};

const rapidAssessmentCache = new Map<string, RapidAssessmentCacheEntry>();

const getCachedRapidAssessment = (key: string): Promise<RapidQuestion[]> | null => {
  const cached = rapidAssessmentCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    rapidAssessmentCache.delete(key);
    return null;
  }

  return cached.promise;
};

const setCachedRapidAssessment = (key: string, promise: Promise<RapidQuestion[]>) => {
  rapidAssessmentCache.set(key, {
    expiresAt: Date.now() + ASSESSMENT_CONFIG.CACHE.TTL_MS,
    promise,
  });

  promise.catch(() => {
    const latest = rapidAssessmentCache.get(key);
    if (latest?.promise === promise) {
      rapidAssessmentCache.delete(key);
    }
  });
};

const isAuthRelatedError = (error: unknown): boolean => {
  const message = String((error as any)?.message || '').toLowerCase();
  return (
    message.includes('sign in') ||
    message.includes('expired') ||
    message.includes('access denied') ||
    message.includes('authentication required')
  );
};

// Model configurations
const MODELS = {
  PRIMARY: "z-ai/glm4.7",
  ALTERNATIVE: "meta/llama-3.1-405b-instruct",
  LIGHTWEIGHT: "mistralai/mistral-7b-instruct-v0.2",
  BALANCED: "meta/llama-3.1-405b-instruct"
};

// --- PERSONA DEFINITION ---
const ADVISOR_PERSONA = `You are a world-class, 10-year experienced Personalized Career Advisor and Curriculum Designer. 
Your advice is strictly professional, highly strategic, up-to-date with 2024-2025 industry standards, and grounded in real-world application. 
You prioritize "legit", authoritative resources and practical skills over generic fluff. Always provide responses in valid JSON format when requested.`;

const MODEL_BY_TASK = {
  ROADMAP: MODELS.PRIMARY,
  RESOURCE_CURATION: MODELS.BALANCED,
  QUIZ: MODELS.BALANCED,
  CHAT: MODELS.LIGHTWEIGHT,
  ANALYSIS: MODELS.ALTERNATIVE,
};

const generateComprehensiveUserContext = (profile: UserProfile): string => {
    const parts = [
        `**Name**: ${profile.fullName || 'The User'}`,
      `**Role**: ${profile.role || 'user'}`,
        `**Current Academic Stage**: ${profile.academicLevel}`,
        `**Stream/Field**: ${profile.stream}`,
        `**Primary Focus/Goal**: ${profile.focusArea}`,
        `**Preferred Learning Style**: ${profile.learningStyle}`,
        `**Interest Domain**: ${profile.interests || 'None listed'}`,
        `**Target Skill**: ${profile.skills || 'None listed'}`,
    ];

    if (profile.academicCourse) parts.push(`**Branch/Course**: ${profile.academicCourse}`);
    if (profile.specialization) parts.push(`**Specialization/Academics**: ${profile.specialization || profile.interestedSubjects}`);
    if (profile.interestedSubjects) parts.push(`**Interested Subjects**: ${profile.interestedSubjects}`);
    
    if (profile.class10Performance) parts.push(`**Class 10 Performance**: ${profile.class10Performance}`);
    if (profile.class12Performance) parts.push(`**Class 12 Performance**: ${profile.class12Performance} (${profile.class12Stream})`);
    if (profile.diplomaPerformance) parts.push(`**Diploma Performance**: ${profile.diplomaPerformance}`);
    if (profile.previousPerformance) parts.push(`**Recent Academic Score**: ${profile.previousPerformance}`);

    if (profile.skillDivision) {
        const divisionMap: Record<number, string> = { 1: "Top Tier Expert", 2: "Advanced", 3: "Intermediate", 4: "Basic", 5: "Novice" };
        parts.push(`**Assessed Skill Division**: ${divisionMap[profile.skillDivision] || 'Not Assessed'}`);
    }

    if (profile.resumePath) {
      parts.push(`**Resume Uploaded**: Yes`);
    }

    return parts.join('\n');
};

// ============================================
// EXPORTED FUNCTIONS - Keep same signatures
// ============================================

export const getSkillSuggestions = async (profile: UserProfile): Promise<Suggestion[]> => {
    const userContext = generateComprehensiveUserContext(profile);
    const prompt = `${ADVISOR_PERSONA}
    
    Analyze the following user profile deeply:
    ${userContext}

    Based on their academic background, specific interests, and career focus area, suggest 6 unique, high-value, and forward-looking skills they should learn next.
    Avoid generic suggestions. Connect the skills to their specific stream and goals.
    
    Respond ONLY with valid JSON with this structure:
    {
      "suggestions": [
        {"name": "Skill Name", "description": "Why this fits their profile"},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    const data = parseJsonResponse<{ suggestions: Suggestion[] }>(response);
    return data.suggestions;
};

/**
 * Generate a rapid assessment quiz for a skill
 * Uses strict validation and unified scoring logic
 */
export const getRapidAssessment = async (
  skillName: string,
  interestDomain: string,
): Promise<RapidQuestion[]> => {
  // Validate inputs strictly
  if (!skillName || typeof skillName !== 'string' || skillName.trim().length === 0) {
    throw new Error('Skill name is required');
  }
  if (!interestDomain || typeof interestDomain !== 'string' || interestDomain.trim().length === 0) {
    throw new Error('Interest domain is required');
  }

  const normalizedSkill = skillName.trim();
  const normalizedDomain = interestDomain.trim();

  // Check cache with unified key
  const cacheKey = buildCacheKey(normalizedSkill, normalizedDomain);
  const cached = getCachedRapidAssessment(cacheKey);
  if (cached) {
    const cachedResult = await cached;
    return cloneQuestions(cachedResult);
  }

  // Generate assessment quiz with unified prompt
  const generationPromise = (async (): Promise<RapidQuestion[]> => {
    const prompt = buildPreciseAssessmentPrompt(
      normalizedSkill,
      normalizedDomain,
      ASSESSMENT_CONFIG.RAPID_ASSESSMENT.TARGET_QUESTIONS,
    );

    try {
      const response = await callNvidiaAPI(
        prompt,
        ASSESSMENT_CONFIG.RAPID_ASSESSMENT.MODEL,
        ASSESSMENT_CONFIG.RAPID_ASSESSMENT.TEMPERATURE,
        ASSESSMENT_CONFIG.RAPID_ASSESSMENT.TOP_P,
        {
          timeoutMs: ASSESSMENT_CONFIG.RAPID_ASSESSMENT.TIMEOUT_MS,
          maxTokens: 1200,
        },
      );

      const parsed = parseJsonResponse<unknown>(response);
      const validation = validateAssessmentResponse(parsed);

      if (!validation.isValid) {
        logAssessmentError('getRapidAssessment:validation_failed', 'Response validation failed', {
          skillName: normalizedSkill,
          domain: normalizedDomain,
          errorCount: validation.errors.length,
          firstError: validation.errors[0],
        });
        throw new Error(
          `Assessment validation failed: ${validation.errors[0]?.issue || 'Unknown validation error'}`,
        );
      }

      // Extract validated questions
      const dataObj = parsed as any;
      const questionsArray = Array.isArray(dataObj?.quiz)
        ? dataObj.quiz
        : Array.isArray(dataObj?.questions)
          ? dataObj.questions
          : [];

      const questions = questionsArray.slice(0, ASSESSMENT_CONFIG.RAPID_ASSESSMENT.TARGET_QUESTIONS);

      if (questions.length < ASSESSMENT_CONFIG.RAPID_ASSESSMENT.MIN_QUESTIONS) {
        throw new Error(
          `Insufficient questions: expected ${ASSESSMENT_CONFIG.RAPID_ASSESSMENT.MIN_QUESTIONS}, got ${questions.length}`,
        );
      }

      return questions;
    } catch (error: unknown) {
      if (isAuthRelatedError(error)) {
        throw error;
      }

      logAssessmentError('getRapidAssessment:generation_failed', error, {
        skillName: normalizedSkill,
        domain: normalizedDomain,
      });

      throw error;
    }
  })();

  setCachedRapidAssessment(cacheKey, generationPromise);
  const generated = await generationPromise;
  return cloneQuestions(generated);
};

/**
 * Build precise assessment prompt for consistent quality
 */
const buildPreciseAssessmentPrompt = (
  skill: string,
  domain: string,
  targetQuestions: number,
): string => {
  return `Generate exactly ${targetQuestions} diagnostic placement quiz questions for "${skill}" within context of "${domain}".

CRITICAL CONSTRAINTS:
- 3-4 beginner level questions, 3-4 intermediate level, 2-3 advanced level
- Each question MUST be 8-15 words maximum
- EXACTLY 4 unique non-redundant options per question
- correctAnswer MUST be exactly one of the 4 options (copy exact string)
- Options must NOT repeat across different questions
- No duplicate questions
- Focus on conceptual understanding, not trivia

Response MUST be valid JSON only (no markdown, no extra text):
{"quiz":[{"question":"What is X?","options":["Option A","Option B","Option C","Option D"],"correctAnswer":"Option C"},...]}`;
};

export const getRoadmap = async (skillName: string, weeks: string, level: string, profile: UserProfile): Promise<RoadmapData> => {
    const userContext = generateComprehensiveUserContext(profile);

    let focusInstruction = '';
    if (profile.focusArea === 'NCVET/NSQF Aligned') {
        focusInstruction = `CRITICAL: The roadmap MUST be strictly aligned with the Indian NCVET/NSQF standards. Mention specific NSQF levels in the week themes.`;
    } else if (profile.focusArea === 'Govt. Job Exams') {
        focusInstruction = `CRITICAL: Align the curriculum with syllabus requirements for top Indian Govt Exams (UPSC, SSC, Banking).`;
    }
    
    const roadmapPrompt = `${ADVISOR_PERSONA}

    Create a Master-Class level, completely personalized learning roadmap for the skill "${skillName}".
    
    User Profile:
    ${userContext}
    
    Constraints:
    - Skill Level: ${level}
    - Duration: ${weeks} weeks
    - ${focusInstruction}
    
    Requirements:
    1. Hyper-Personalize for their course (${profile.academicCourse}) and specialization
    2. Ensure logical progression from fundamentals to industry-ready application
    3. Use ALL user profile details above while designing scope, examples, and milestones
    4. Keep weekly goals realistic for the student's level and performance history
    
    Respond ONLY with valid JSON:
    {
      "skill": "${skillName}",
      "roadmap": [
        {"week": 1, "theme": "...", "goals": ["...", "...", "..."], "resources": [{"title": "...", "searchQuery": "..."}, ...]},
        ...
      ]
    }`;

    const resourcesPrompt = `${ADVISOR_PERSONA}
    
    Curate the best resources for learning "${skillName}" at a ${level} level.
    
    User Context:
    ${userContext}

    Respond ONLY with valid JSON:
    {
      "freePlatforms": [{"name": "...", "description": "...", "searchQuery": "..."}, {"name": "...", "description": "...", "searchQuery": "..."}],
      "paidPlatforms": [{"name": "...", "description": "...", "searchQuery": "..."}, {"name": "...", "description": "...", "searchQuery": "..."}],
      "books": [{"name": "...", "description": "...", "searchQuery": "..."}, {"name": "...", "description": "...", "searchQuery": "..."}]
    }`;
    
    const [roadmapResponse, resourcesResponse] = await Promise.all([
      callNvidiaAPI(roadmapPrompt, MODEL_BY_TASK.ROADMAP, 0.3),
      callNvidiaAPI(resourcesPrompt, MODEL_BY_TASK.RESOURCE_CURATION, 0.3)
    ]);

    const roadmapData = parseJsonResponse<{ skill: string; roadmap: RoadmapWeek[] }>(roadmapResponse);
    const resourcesData = parseJsonResponse<{ freePlatforms: any[]; paidPlatforms: any[]; books: any[] }>(resourcesResponse);

    return { ...roadmapData, ...resourcesData };
};

export const getSkillLevelQuiz = async (skillName: string): Promise<QuizQuestion[]> => {
    const prompt = `${ADVISOR_PERSONA}
    Create a diagnostic quiz to determine if a user is Beginner, Intermediate, or Expert in '${skillName}'.
    Generate exactly 6 technical and conceptual questions (no trivia).
    
    Respond ONLY with valid JSON:
    {
      "quiz": [
        {"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.QUIZ, 0.3);
    return parseJsonResponse<{ quiz: QuizQuestion[] }>(response).quiz;
};

export const getWeekAssessment = async (skillName: string, weekTheme: string): Promise<QuizQuestion[]> => {
    const prompt = `${ADVISOR_PERSONA}
    Create a rigorous assessment for '${weekTheme}' within '${skillName}'.
    
    Requirements:
    - Exactly 15 questions
    - Intermediate to Hard difficulty
    - Test deep understanding, not just memory
    
    Respond ONLY with valid JSON:
    {
      "quiz": [
        {"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.QUIZ, 0.3);
    return parseJsonResponse<{ quiz: QuizQuestion[] }>(response).quiz;
};

export const getAiCoachResponse = async (skillName: string, userInput: string): Promise<string> => {
    const prompt = `You are 'Horizon', a mentor coaching a student through '${skillName}'.
    User asks: "${userInput}"
    Provide a helpful, specific, encouraging response. Use analogies if complex. Keep it under 150 words.`;
    
    return callNvidiaAPI(prompt, MODEL_BY_TASK.CHAT, 0.7);
};

export const getQuiz = async (skillName: string, weekTheme: string): Promise<QuizQuestion[]> => {
    const prompt = `${ADVISOR_PERSONA} Create a quick 3-question conceptual check for '${weekTheme}' in '${skillName}'.
    
    Respond ONLY with valid JSON:
    {
      "quiz": [
        {"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.QUIZ, 0.3);
    return parseJsonResponse<{ quiz: QuizQuestion[] }>(response).quiz;
};

export const getProjectSuggestions = async (skillName: string, interests: string): Promise<Project[]> => {
    const prompt = `${ADVISOR_PERSONA}
    Suggest 3 portfolio-worthy projects for '${skillName}' aligned with interest: '${interests}'.
    These should look impressive on a resume, not just "To-Do Lists".
    
    Respond ONLY with valid JSON:
    {
      "projects": [
        {"title": "...", "description": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.7);
    return parseJsonResponse<{ projects: Project[] }>(response).projects;
};

export const getProjectDetails = async (skillName: string, projectTitle: string): Promise<ProjectDetails> => {
    const prompt = `${ADVISOR_PERSONA}
    Provide a professional architectural brief for "${projectTitle}" using "${skillName}".
    Make it detailed enough for a developer to start building.
    
    Respond ONLY with valid JSON:
    {
      "project_overview": "...",
      "core_features": ["...", "...", "..."],
      "tech_stack_suggestions": ["...", "...", "..."]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<ProjectDetails>(response);
};

export const getFlashcards = async (skillName: string, weekTheme: string): Promise<Flashcard[]> => {
    const prompt = `Create 6 high-yield flashcards for '${weekTheme}' in '${skillName}'. Focus on key definitions and core concepts.
    
    Respond ONLY with valid JSON:
    {
      "flashcards": [
        {"term": "...", "definition": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODELS.ALTERNATIVE, 0.3);
    return parseJsonResponse<{ flashcards: Flashcard[] }>(response).flashcards;
};

export const getELI5 = async (skillName: string, weekTheme: string): Promise<string> => {
    const prompt = `Explain '${weekTheme}' from '${skillName}' using a simple, intuitive analogy for a beginner. Keep it under 100 words.`;
    
    return callNvidiaAPI(prompt, MODELS.LIGHTWEIGHT, 0.7);
};

export const getDeepDive = async (skillName: string): Promise<{ what_is_it: string; why_useful: string; why_learn: string; }> => {
    const prompt = `${ADVISOR_PERSONA} Provide a professional deep dive into "${skillName}".
    
    Respond ONLY with valid JSON:
    {
      "what_is_it": "...",
      "why_useful": "Industry context...",
      "why_learn": "Career impact..."
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<{ what_is_it: string; why_useful: string; why_learn: string; }>(response);
};

export const getToughness = async (skillName: string): Promise<Toughness> => {
    const prompt = `Assess the difficulty of learning "${skillName}" (1-100) for an average student.
    
    Respond ONLY with valid JSON:
    {
      "toughness": 75,
      "justification": "..."
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<Toughness>(response);
};

export const getJobTrendData = async (skillName: string): Promise<JobTrendData> => {
    const prompt = `Analyze the 2024-2025 job market trend for "${skillName}" in India.
    
    Respond ONLY with valid JSON:
    {
      "trend": "high growth|moderate growth|stable|declining",
      "base_jobs": 5000
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<JobTrendData>(response);
};

export const getAcademicSuggestions = async (profile: UserProfile): Promise<AcademicSuggestion[]> => {
    const userContext = generateComprehensiveUserContext(profile);
    const prompt = `${ADVISOR_PERSONA}
    Based on this profile, suggest 3-4 academic paths, degrees, or certifications that would best boost their career:
    ${userContext}
    
    Respond ONLY with valid JSON:
    {
      "suggestions": [
        {"name": "...", "description": "...", "searchQuery": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<{ suggestions: AcademicSuggestion[] }>(response).suggestions;
};

export const getTimelineEvents = async (profile: UserProfile, skill: string): Promise<TimelineEvent[]> => {
    const { academicLevel, stream } = profile;
    const prompt = `Create timeline of 4 academic/career events for ${academicLevel} ${stream} student learning ${skill} in India (Current: March 2026).
    
    Respond ONLY with valid JSON:
    {
      "timelineEvents": [
        {"eventName": "...", "eventType": "...", "estimatedDate": "...", "description": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<{ timelineEvents: TimelineEvent[] }>(response).timelineEvents;
};

export const getOfflineCenters = async (skillName: string): Promise<OfflineCenter[]> => {
    const prompt = `Suggest 3 types of offline institutions where one can learn '${skillName}' in India (Coaching Centers, Universities, Bootcamps, etc).
    
    Respond ONLY with valid JSON:
    {
      "centers": [
        {"name": "...", "description": "...", "searchQuery": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<{ centers: OfflineCenter[] }>(response).centers;
};

export const getCareerPaths = async (skillName: string, resumeText?: string): Promise<Career[]> => {
    const resumeContext = resumeText ? `\n\nUser's Resume:\n${resumeText}\n` : '';
    const prompt = `${ADVISOR_PERSONA}
    Based on the skill "${skillName}", suggest 3 high-potential career paths in the Indian market.${resumeContext}
    
    Respond ONLY with valid JSON:
    {
      "careers": [
        {"title": "...", "description": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<{ careers: Career[] }>(response).careers;
};

export const getCareerDetails = async (careerTitle: string, skillName: string): Promise<CareerDetails> => {
    const prompt = `${ADVISOR_PERSONA}
    Provide a detailed breakdown for the role of "${careerTitle}" with focus on "${skillName}" in the Indian job market.
    
    Respond ONLY with valid JSON:
    {
      "key_responsibilities": ["...", "...", "..."],
      "key_roles": ["...", "..."],
      "salary_expectations": {
        "fresher": "3-5 LPA",
        "intermediate": "8-12 LPA",
        "expert": "15+ LPA"
      },
      "top_recruiting_companies": ["...", "...", "...", "...", "..."]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<CareerDetails>(response);
};

export const getMockInterview = async (careerTitle: string): Promise<MockInterview> => {
    const prompt = `${ADVISOR_PERSONA}
    Create a mini mock interview for a "${careerTitle}" role.
    
    Respond ONLY with valid JSON:
    {
      "theory_questions": ["...", "...", "..."],
      "mcq_questions": [
        {"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.QUIZ, 0.7);
    return parseJsonResponse<MockInterview>(response);
};

export const getStudyPlan = async (skillName: string, topic: string, duration: string): Promise<StudyPlanItem[]> => {
    const prompt = `Create a study plan for ${duration} minutes on '${topic}' in '${skillName}'.
    
    Respond ONLY with valid JSON:
    {
      "plan": [
        {"activity": "...", "duration_minutes": 15},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODELS.ALTERNATIVE, 0.3);
    return parseJsonResponse<{ plan: StudyPlanItem[] }>(response).plan;
};

export const getSetupGuide = async (skillName: string): Promise<SetupStep[]> => {
    const prompt = `Provide 3 essential setup steps for learning '${skillName}'.
    
    Respond ONLY with valid JSON:
    {
      "setupSteps": [
        {"title": "...", "description": "...", "searchQuery": "...", "resourceLink": "..."},
        ...
      ]
    }`;
    
    let response = '';
    try {
      response = await callNvidiaAPI(prompt, MODELS.ALTERNATIVE, 0.3);
    } catch (error: any) {
      const message = String(error?.message || '');
      // Fallback when alternative model is unavailable for this account/region.
      if (message.includes('404') || message.toLowerCase().includes('not found')) {
        response = await callNvidiaAPI(prompt, MODEL_BY_TASK.RESOURCE_CURATION, 0.3);
      } else {
        throw error;
      }
    }

    const parsed = parseJsonResponse<any>(response);
    const rawSteps = parsed?.setupSteps || parsed?.setup_steps || parsed?.steps || [];

    if (!Array.isArray(rawSteps)) {
      return [];
    }

    return rawSteps
      .filter((step: any) => step && (step.title || step.description))
      .map((step: any) => {
        const title = String(step.title || 'Setup Step').trim();
        const description = String(step.description || 'Follow this setup step to continue.').trim();
        const resourceLink = typeof step.resourceLink === 'string' ? step.resourceLink.trim() : '';
        const searchQuery = String(step.searchQuery || title).trim();

        return {
          title,
          description,
          searchQuery,
          resourceLink: resourceLink || undefined,
        } as SetupStep;
      })
      .slice(0, 5);
};

export const getRealWorldScenarios = async (skillName: string, weekTheme: string): Promise<RealWorldScenario[]> => {
    const prompt = `${ADVISOR_PERSONA}
    Describe 2 real-world scenarios where a professional would apply '${weekTheme}' in '${skillName}'.
    
    Respond ONLY with valid JSON:
    {
      "scenarios": [
        {"scenario_title": "...", "problem_statement": "...", "key_tasks": ["...", "..."]},
        ...
      ]
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.7);
    return parseJsonResponse<{ scenarios: RealWorldScenario[] }>(response).scenarios;
};

export const getHelpForStuck = async (skillName: string, weekTheme: string, problemDescription: string): Promise<string> => {
  const prompt = `Explain '${weekTheme}' in '${skillName}' to help a student stuck on: "${problemDescription}". Use a simple analogy. Keep under 200 words.`;
  return callNvidiaAPI(prompt, MODEL_BY_TASK.CHAT, 0.7);
};

export const getConceptConnections = async (skillName: string, weekTheme: string): Promise<ConceptConnection[]> => {
  const prompt = `${ADVISOR_PERSONA}
  Connect '${weekTheme}' in '${skillName}' to 2 other disciplines or fields.

  Respond ONLY with valid JSON:
  {
    "connections": [
    {"field": "...", "explanation": "..."},
    ...
    ]
  }`;

  const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.7);
  return parseJsonResponse<{ connections: ConceptConnection[] }>(response).connections;
};

export const getDebateTopic = async (skillName: string, weekTheme: string): Promise<Debate> => {
    const prompt = `Propose a controversial or debatable topic related to '${weekTheme}' in '${skillName}'.
    
    Respond ONLY with valid JSON:
    {
      "topic": "...",
      "opening_statement": "..."
    }`;
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.7);
    return parseJsonResponse<Debate>(response);
};

export const getDebateRebuttal = async (history: { role: string; parts: { text: string }[] }[]): Promise<string> => {
    const conversationText = history.map(msg => `${msg.role}: ${msg.parts.map(p => p.text).join(' ')}`).join('\n');
    const prompt = `You are a witty AI debate antagonist. Continue this debate with a concise, challenging rebuttal:\n\n${conversationText}`;

  return callNvidiaAPI(prompt, MODEL_BY_TASK.CHAT, 0.8);
};

export const getCareerRecommendation = async (profile: UserProfile): Promise<CareerRecommendation> => {
  const userContext = generateComprehensiveUserContext(profile);
  const prompt = `${ADVISOR_PERSONA}
  Based on this profile:
  ${userContext}

  Recommend the ONE single best career path for them.

  Respond ONLY with valid JSON:
  {
    "career_title": "...",
    "reason": "...",
    "next_steps": ["...", "...", "..."]
  }`;

  const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
  return parseJsonResponse<CareerRecommendation>(response);
};

export const analyzeResume = async (resumeText: string): Promise<ResumeAnalysis> => {
    const prompt = `${ADVISOR_PERSONA}
    Act as an expert ATS and Senior Recruiter. Analyze this resume (be strict):
    
    "${resumeText}"
    
    Respond ONLY with valid JSON:
    {
      "score": 75,
      "feedback": "...",
      "strengths": ["...", "...", "..."],
      "improvements": ["...", "...", "..."]
    }`;

    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3);
    return parseJsonResponse<ResumeAnalysis>(response);
};

/**
 * Generate educational images
 * Note: NVIDIA doesn't provide image generation in the free tier,
 * so this returns a placeholder. Consider using a dedicated image generation API.
 */
export const generateImage = async (description: string): Promise<string | null> => {
    try {
        console.warn("Image generation is not available through NVIDIA API. Using placeholder.");
        // Return null so UI can render fallback instead of breaking
        return null;
    } catch (error: any) {
        console.error("Image generation failed:", error);
        return null;
    }
};

/**
 * Generate audio overview
 * Note: Audio generation is not currently available through NVIDIA Build API.
 * This is a placeholder for future implementation.
 */
export const getAudioOverview = async (skillName: string, roadmap: RoadmapWeek[]): Promise<string> => {
    const summary = `Overview for ${skillName}. Week 1: ${roadmap[0]?.theme || 'Introduction'}. Final week: ${roadmap[roadmap.length - 1]?.theme || 'Mastery'}. Good luck!`;
    
    try {
        console.warn("Audio generation is not available through NVIDIA API. Returning text summary.");
        // Return text summary as fallback
        return Buffer.from(summary).toString('base64');
    } catch (error: any) {
        console.error("Audio generation failed:", error);
        throw new Error("Could not generate audio overview.");
    }
};

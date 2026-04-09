import { UserProfile, Suggestion, RoadmapData, QuizQuestion, RapidQuestion, Flashcard, Project, Toughness, JobTrendData, AcademicSuggestion, TimelineEvent, OfflineCenter, Career, StudyPlanItem, SetupStep, RealWorldScenario, ConceptConnection, Debate, CareerRecommendation, RoadmapWeek, ProjectDetails, CareerDetails, MockInterview, FocusArea, ResumeAnalysis, AssessmentFlowResult } from '../types';

/**
 * NVIDIA BUILD API SERVICE (via Local Proxy)
 * =========================================
 * Frontend calls local API proxy (default: http://localhost:3004)
 * Backend proxy calls NVIDIA API (server-to-server, no CORS)
 * This avoids browser CORS restrictions
 */

// API Proxy Server URL
// In production, avoid using localhost values baked from build-time .env.
const configuredApiBase = String(import.meta.env.VITE_API_PROXY_BASE || '').trim();
const configuredPointsToLocalhost = /(^|\/\/)(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configuredApiBase);
const browserIsLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const normalizeApiBase = (base: string) => base.replace(/\/+$/, '');
const API_BASE_CANDIDATES = Array.from(new Set([
  ...(configuredApiBase && (!configuredPointsToLocalhost || browserIsLocalhost)
    ? [normalizeApiBase(configuredApiBase)]
    : []),
  ...(browserIsLocalhost
    ? [
        normalizeApiBase('http://localhost:3004/api'),
        normalizeApiBase('http://127.0.0.1:3004/api'),
      ]
    : [
        normalizeApiBase(`${window.location.origin}/api`),
        '/api',
      ]),
]));
let preferredApiBase = API_BASE_CANDIDATES[0] || '/api';

/**
 * Make API calls through local proxy server
 */
const callNvidiaAPI = async (
    prompt: string,
    model: string = 'meta/llama-3.1-405b-instruct',
    temperature: number = 0.3,
  topP: number = 0.7,
    maxTokens: number = 3072,
): Promise<string> => {   
    let retries = 3;
    let lastError: any = null;

    while (retries > 0) {
        try {
            let response: Response | null = null;
            let networkError: any = null;
        const orderedApiBases = [
          preferredApiBase,
          ...API_BASE_CANDIDATES.filter(base => base !== preferredApiBase),
        ];

        for (const apiBase of orderedApiBases) {
                try {
                    response = await fetch(`${apiBase}/chat`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          model,
                            messages: [{ role: 'user', content: prompt }],
                            temperature,
                          top_p: topP,
                    max_tokens: maxTokens,
                        })
                    });
                    preferredApiBase = apiBase;
                    networkError = null;
                    break;
                } catch (fetchErr: any) {
                    networkError = fetchErr;
                    lastError = fetchErr;
                }
            }

            if (!response) {
                throw networkError || new Error('Network request failed');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
              const message = error.error || `HTTP ${response.status}: ${response.statusText}`;

              // GLM fallback: if key-1 model is unavailable on provider side, degrade to key-2 Llama route.
              if (model === 'z-ai/glm4.7' && (String(message).includes('404') || String(message).toLowerCase().includes('not found'))) {
                return callNvidiaAPI(prompt, 'meta/llama-3.1-405b-instruct', temperature, topP);
              }

              throw new Error(message);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        } catch (error: any) {
            lastError = error;
            const errorMsg = error.message || '';

            if (errorMsg.includes('429') || errorMsg.includes('overloaded')) {
                retries--;
                if (retries > 0) {
                    await new Promise(res => setTimeout(res, 2000));
                    continue;
                }
            }

            if (retries === -1 || !errorMsg.includes('429')) {
                throw new Error(errorMsg || 'API request failed');
            }
            retries--;
        }
    }

    throw lastError || new Error('API request failed after retries');
};

/**
 * Parse JSON from text response, handling markdown code blocks and partial wrappers.
 */
const parseJsonResponse = <T,>(text: string): T => {
  const rawText = String(text || '').trim();

  if (!rawText) {
    throw new Error('Invalid JSON response from API.');
  }

  const candidates = [
    rawText,
    rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim(),
    rawText.replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim(),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      const objectStart = candidate.indexOf('{');
      const objectEnd = candidate.lastIndexOf('}');
      if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
        try {
          return JSON.parse(candidate.slice(objectStart, objectEnd + 1)) as T;
        } catch {
          // Continue trying other candidates.
        }
      }

      const arrayStart = candidate.indexOf('[');
      const arrayEnd = candidate.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        try {
          return JSON.parse(candidate.slice(arrayStart, arrayEnd + 1)) as T;
        } catch {
          // Continue trying other candidates.
        }
      }
    }
  }

  throw new Error('Invalid JSON response from API.');
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
      `**Role**: ${profile.role || 'learner'}`,
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

  const buildFallbackQuizQuestions = (topic: string, context: string, totalQuestions: number): Array<{ question: string; options: string[]; correctAnswer: string; explanation: string }> => {
    const normalizedTopic = topic || 'this skill';
    const normalizedContext = context || 'general learning';

    const baseQuestions = [
      {
        question: `What is the best first step when learning ${normalizedTopic} for ${normalizedContext}?`,
        options: [
          'Learn the core principles and key terms first',
          'Skip the basics and jump directly to advanced projects',
          'Memorize answers without understanding them',
          'Wait until you feel fully confident before starting',
        ],
        correctAnswer: 'Learn the core principles and key terms first',
        explanation: `A strong foundation makes it easier to apply ${normalizedTopic} correctly in ${normalizedContext}.`,
      },
      {
        question: `Which habit improves retention most while studying ${normalizedTopic}?`,
        options: [
          'Spaced repetition with active recall',
          'Cramming everything in one sitting',
          'Only watching videos without practice',
          'Skipping review once you finish a lesson',
        ],
        correctAnswer: 'Spaced repetition with active recall',
        explanation: 'Reviewing material over time and recalling it from memory is one of the most reliable ways to retain knowledge.',
      },
      {
        question: `When applying ${normalizedTopic} to a real project, what should you prioritize?`,
        options: [
          'Solving the actual problem and meeting constraints',
          'Adding as many features as possible',
          'Choosing tools at random',
          'Avoiding feedback until the end',
        ],
        correctAnswer: 'Solving the actual problem and meeting constraints',
        explanation: `Practical use of ${normalizedTopic} should be driven by the problem you are solving, not by feature count.`,
      },
      {
        question: `What is the most reliable way to debug a mistake in ${normalizedTopic}?`,
        options: [
          'Change one thing at a time and test the result',
          'Change several things together and hope for the best',
          'Ignore the error until it disappears',
          'Restart the project without checking the cause',
        ],
        correctAnswer: 'Change one thing at a time and test the result',
        explanation: 'Controlled debugging isolates the cause of the issue and prevents confusion.',
      },
      {
        question: `How do you know you are ready for the next level in ${normalizedTopic}?`,
        options: [
          'You can explain concepts and apply them without help',
          'You have memorized a few definitions',
          'You have collected many notes',
          'You watched a single tutorial recently',
        ],
        correctAnswer: 'You can explain concepts and apply them without help',
        explanation: 'True readiness shows up when you can transfer knowledge into new situations.',
      },
      {
        question: `What is the most effective way to handle difficult parts of ${normalizedTopic}?`,
        options: [
          'Break the problem into smaller parts',
          'Avoid the difficult part entirely',
          'Guess the answer and move on',
          'Focus only on the easiest topics',
        ],
        correctAnswer: 'Break the problem into smaller parts',
        explanation: 'Decomposition turns a complex task into manageable pieces.',
      },
      {
        question: `Why should you compare multiple approaches while learning ${normalizedTopic}?`,
        options: [
          'To understand trade-offs and choose the best fit',
          'To make the process slower for no reason',
          'To avoid making any decision',
          'To keep the work purely theoretical',
        ],
        correctAnswer: 'To understand trade-offs and choose the best fit',
        explanation: 'Different approaches often solve different kinds of problems better.',
      },
      {
        question: `What should you do after completing a major study session on ${normalizedTopic}?`,
        options: [
          'Review what you got wrong and summarize the lesson',
          'Never revisit the material again',
          'Assume the topic is fully mastered immediately',
          'Switch topics without checking understanding',
        ],
        correctAnswer: 'Review what you got wrong and summarize the lesson',
        explanation: 'Reflection helps convert study time into durable understanding.',
      },
      {
        question: `Which input is most valuable when improving your ${normalizedTopic} work?`,
        options: [
          'Specific feedback from someone familiar with the subject',
          'Random opinions with no context',
          'Only praise without critique',
          'No feedback at all',
        ],
        correctAnswer: 'Specific feedback from someone familiar with the subject',
        explanation: 'Targeted feedback reveals gaps faster than trial and error alone.',
      },
      {
        question: `What is the best way to keep progressing in ${normalizedTopic} over time?`,
        options: [
          'Study consistently with small repeated practice sessions',
          'Study only when you feel stuck',
          'Skip practice once the first concept is clear',
          'Depend only on automatic answers',
        ],
        correctAnswer: 'Study consistently with small repeated practice sessions',
        explanation: 'Consistency beats intensity when the goal is long-term skill growth.',
      },
      {
        question: `What should you do when a ${normalizedTopic} lesson feels too advanced?`,
        options: [
          'Revisit prerequisite concepts before moving on',
          'Ignore the gap and continue blindly',
          'Assume you do not need the topic',
          'Only memorize the final answer',
        ],
        correctAnswer: 'Revisit prerequisite concepts before moving on',
        explanation: 'Prerequisites make advanced material easier to understand.',
      },
      {
        question: `Why is it useful to connect ${normalizedTopic} to real-world use cases?`,
        options: [
          'It makes the learning more practical and memorable',
          'It reduces the need to understand the topic',
          'It makes the subject irrelevant',
          'It replaces practice completely',
        ],
        correctAnswer: 'It makes the learning more practical and memorable',
        explanation: 'Examples anchor abstract ideas in something concrete.',
      },
      {
        question: `What is the safest way to handle mistakes while learning ${normalizedTopic}?`,
        options: [
          'Treat mistakes as signals to refine your process',
          'Hide mistakes and move on',
          'Ignore them to save time',
          'Assume mistakes mean you should stop learning',
        ],
        correctAnswer: 'Treat mistakes as signals to refine your process',
        explanation: 'Mistakes are useful because they show exactly what needs attention.',
      },
      {
        question: `What should a good study workflow for ${normalizedTopic} include?`,
        options: [
          'Learn, practice, review, and refine',
          'Only watch content without applying it',
          'Jump between topics without structure',
          'Avoid testing your understanding',
        ],
        correctAnswer: 'Learn, practice, review, and refine',
        explanation: 'A closed learning loop keeps progress measurable and steady.',
      },
      {
        question: `What is the most useful sign that your ${normalizedTopic} understanding is improving?`,
        options: [
          'You can solve new variations with less guidance',
          'You can recite notes from memory only',
          'You feel busy without checking results',
          'You stop practicing because it feels familiar',
        ],
        correctAnswer: 'You can solve new variations with less guidance',
        explanation: 'Progress shows up when transfer to new problems becomes easier.',
      },
    ];

    return Array.from({ length: totalQuestions }).map((_, index) => {
      const base = baseQuestions[index % baseQuestions.length];
      return {
        question: base.question,
        options: [...base.options],
        correctAnswer: base.correctAnswer,
        explanation: base.explanation,
      };
    });
  };

const ROADMAP_ROUTE_TIMEOUT_MS = Number(import.meta.env.VITE_ROADMAP_ROUTE_TIMEOUT_MS || 8000);

const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const buildFallbackRoadmapData = (
  profile: UserProfile,
  selectedCareer: string,
  assessmentResult: AssessmentFlowResult,
): RoadmapData => {
  const skill = String(selectedCareer || assessmentResult.selectedCareer || assessmentResult.skillName || profile.skills || 'Learning Roadmap').trim();
  const totalWeeks = clampNumber(Number.parseInt(String(assessmentResult.recommendedWeeks || '12'), 10) || 12, 4, 16);
  const level = String(assessmentResult.recommendedLevel || 'Beginner').toLowerCase();
  const focusArea = String(profile.focusArea || 'general').toLowerCase();

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
          ? 'Capture the top 3 concepts you need to remember'
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

export const getRapidAssessment = async (skillName: string, interestDomain: string): Promise<RapidQuestion[]> => {
    const prompt = `${ADVISOR_PERSONA}
    Generate a thorough placement test for the skill "${skillName}" specialized for the domain "${interestDomain}".
    
    Requirements:
    - Exactly 15 multiple-choice questions
    - 5 Basic/Conceptual questions
    - 5 Intermediate/Application-based questions
    - 5 Advanced/Scenario-based questions
    - Focus on accuracy and depth, not speed
    - Include a one-sentence explanation for why the correct answer is correct
    
    Respond ONLY with valid JSON:
    {
      "quiz": [
        {"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "...", "explanation": "..."},
        ...
      ]
    }`;

    try {
      const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.QUIZ, 0.2, 0.7, 1400, 20000);
      const parsed = parseJsonResponse<{ quiz?: RapidQuestion[]; questions?: RapidQuestion[] } | RapidQuestion[]>(response);
      const quiz = Array.isArray(parsed) ? parsed : parsed.quiz || parsed.questions || [];

      const normalized = quiz.map((question) => ({
        question: String(question.question || '').trim(),
        options: Array.isArray(question.options) ? question.options.map(option => String(option)) : [],
        correctAnswer: String(question.correctAnswer || '').trim(),
        explanation: typeof question.explanation === 'string' ? question.explanation.trim() : '',
      })).filter(question => question.question && question.options.length > 0 && question.correctAnswer);

      if (normalized.length >= 15) {
        return normalized.slice(0, 15);
      }
    } catch {
      // Fall through to the deterministic local fallback.
    }

    return buildFallbackQuizQuestions(skillName, interestDomain, 15).map(question => ({
      ...question,
    }));
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
      callNvidiaAPI(roadmapPrompt, MODEL_BY_TASK.ROADMAP, 0.3, 0.7, 3200, 35000),
      callNvidiaAPI(resourcesPrompt, MODEL_BY_TASK.RESOURCE_CURATION, 0.2, 0.7, 1200, 22000)
    ]);

    const roadmapData = parseJsonResponse<{ skill: string; roadmap: RoadmapWeek[] }>(roadmapResponse);
    const resourcesData = parseJsonResponse<{ freePlatforms: any[]; paidPlatforms: any[]; books: any[] }>(resourcesResponse);

    return { ...roadmapData, ...resourcesData };
};

  export const generateRoadmapFromAssessment = async ({
    profile,
    selectedCareer,
    assessmentResult,
  }: {
    profile: UserProfile;
    selectedCareer: string;
    assessmentResult: AssessmentFlowResult;
  }): Promise<RoadmapData> => {
    const orderedApiBases = [
      preferredApiBase,
      ...API_BASE_CANDIDATES.filter(base => base !== preferredApiBase),
    ];

    const payload = {
      profile,
      selectedCareer,
      assessmentResult,
    };

    for (const apiBase of orderedApiBases) {
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), ROADMAP_ROUTE_TIMEOUT_MS);
        const response = await fetch(`${apiBase}/ai/generate-roadmap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }).finally(() => {
          window.clearTimeout(timeoutId);
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = error.error || `HTTP ${response.status}: ${response.statusText}`;
          if (response.status === 404 || response.status >= 500) {
            break;
          }

          throw new Error(message);
        }

        preferredApiBase = apiBase;
        const data = await response.json();

        if (!data || !data.roadmap) {
          throw new Error('Roadmap response was missing required data.');
        }

        return data as RoadmapData;
      } catch (error) {
        break;
      }
    }

    return buildFallbackRoadmapData(profile, selectedCareer, assessmentResult);
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
    
    try {
      const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.QUIZ, 0.2, 0.7, 900, 18000);
      const parsed = parseJsonResponse<{ quiz: QuizQuestion[] }>(response).quiz;
      if (Array.isArray(parsed) && parsed.length >= 6) {
        return parsed.slice(0, 6);
      }
    } catch {
      // Fall through to fallback.
    }

    return buildFallbackQuizQuestions(skillName, 'skill evaluation', 6).map(({ explanation, ...question }) => question);
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
    
    try {
      const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.QUIZ, 0.2, 0.7, 1500, 22000);
      const parsed = parseJsonResponse<{ quiz: QuizQuestion[] }>(response).quiz;
      if (Array.isArray(parsed) && parsed.length >= 15) {
        return parsed.slice(0, 15);
      }
    } catch {
      // Fall through to fallback.
    }

    return buildFallbackQuizQuestions(skillName, weekTheme, 15).map(({ explanation, ...question }) => question);
};

export const getAiCoachResponse = async (skillName: string, userInput: string): Promise<string> => {
    const prompt = `You are 'Horizon', a mentor coaching a student through '${skillName}'.
    User asks: "${userInput}"
    Provide a helpful, specific, encouraging response. Use analogies if complex. Keep it under 150 words.`;
    
    return callNvidiaAPI(prompt, MODEL_BY_TASK.CHAT, 0.7, 0.8, 500, 15000);
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
    
    try {
      const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.QUIZ, 0.2, 0.7, 600, 15000);
      const parsed = parseJsonResponse<{ quiz: QuizQuestion[] }>(response).quiz;
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 3);
      }
    } catch {
      // Fall through to fallback.
    }

    return buildFallbackQuizQuestions(skillName, weekTheme, 3).map(({ explanation, ...question }) => question);
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
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.6, 0.8, 1100, 20000);
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
    
    const response = await callNvidiaAPI(prompt, MODEL_BY_TASK.ANALYSIS, 0.3, 0.7, 1300, 22000);
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
    
    const response = await callNvidiaAPI(prompt, MODELS.ALTERNATIVE, 0.3, 0.7, 900, 18000);
    return parseJsonResponse<{ flashcards: Flashcard[] }>(response).flashcards;
};

export const getELI5 = async (skillName: string, weekTheme: string): Promise<string> => {
    const prompt = `Explain '${weekTheme}' from '${skillName}' using a simple, intuitive analogy for a beginner. Keep it under 100 words.`;
    
    return callNvidiaAPI(prompt, MODELS.LIGHTWEIGHT, 0.7, 0.8, 350, 12000);
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

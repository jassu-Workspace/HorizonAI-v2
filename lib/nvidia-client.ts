import OpenAI from 'openai';

export type AssessmentResult = {
    id: string;
    status: 'pending' | 'completed' | 'failed';
    score?: number;
    questions?: Array<{
        question: string;
        options: string[];
        correctAnswer?: string;
    }>;
    userLevel?: 'Beginner' | 'Intermediate' | 'Expert';
    feedback?: string;
};

const NVIDIA_BASE_URL = process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1';

/**
 * Get available NVIDIA API keys from environment
 * Returns first available key from the configured pool
 */
const getNvidiaApiKey = (): string => {
    const key1 = process.env.NVIDIA_API_KEY_1?.trim();
    const key2 = process.env.NVIDIA_API_KEY_2?.trim();
    const key3 = process.env.NVIDIA_API_KEY_3?.trim();
    const keyDefault = process.env.NVIDIA_API_KEY?.trim();
    
    const key = key1 || key2 || key3 || keyDefault;
    if (!key) {
        throw new Error('No NVIDIA API keys configured. Set NVIDIA_API_KEY_1, NVIDIA_API_KEY_2, NVIDIA_API_KEY_3, or NVIDIA_API_KEY');
    }
    return key;
};

/**
 * Create NVIDIA OpenAI client
 */
const createNvidiaClient = () => {
    return new OpenAI({
        apiKey: getNvidiaApiKey(),
        baseURL: NVIDIA_BASE_URL,
    });
};

/**
 * Generate rapid assessment questions using NVIDIA API
 * @param skill - The skill to assess
 * @param interestDomain - User's interest domain for context
 * @param datasetContext - Optional dataset reference context
 */
export const generateAssessmentQuestions = async (
    skill: string,
    interestDomain: string,
    datasetContext?: string
): Promise<AssessmentResult['questions']> => {
    try {
        const client = createNvidiaClient();
        
        const prompt = `You are an expert assessment designer. Generate exactly 5 assessment questions to rapidly evaluate a user's skill level in "${skill}" within the context of "${interestDomain}".

${datasetContext ? `Reference context from available courses/resources:\n${datasetContext}\n` : ''}

Requirements:
1. Questions should be a mix of: 1-2 self-rating questions (tagged with "__SELF_RATING__"), 2-3 conceptual questions with multiple choice
2. For self-rating: use options like "Not at all", "Somewhat", "Comfortable", "Very comfortable"
3. For conceptual: provide 4 options with one correct answer
4. Questions should progressively assess from basics to intermediate
5. Make questions practical and scenario-based

Return ONLY valid JSON array with this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctAnswer": "Option 1 or __SELF_RATING__ for self-rating questions"
  }
]

DO NOT include markdown code blocks or any text outside the JSON array.`;

        const response = await client.messages.create({
            model: 'z-ai/glm4.7',
            max_tokens: 1200,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response format from NVIDIA API');
        }

        // Parse the JSON response
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('[nvidia-client] Failed to extract JSON from response:', content.text);
            throw new Error('Failed to parse assessment questions from API response');
        }

        const questions = JSON.parse(jsonMatch[0]);
        
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Invalid questions format from NVIDIA API');
        }

        return questions as AssessmentResult['questions'];
    } catch (error) {
        console.error('[nvidia-client] Error generating assessment questions:', error);
        throw error;
    }
};

/**
 * Generate skill suggestions with dataset context using NVIDIA
 */
export const generateSkillSuggestions = async (
    skill: string,
    interestDomain: string,
    datasetContext?: string
): Promise<Array<{ name: string; description: string }>> => {
    try {
        const client = createNvidiaClient();

        const prompt = `You are a skilled learning advisor. Based on the skill \"${skill}\" and interest domain \"${interestDomain}\", generate 4 practical roadmap suggestions. Use the following course/resource context to make the suggestions more concrete:\n\n${datasetContext || 'No dataset context available.'}\n\nReturn only a JSON array of objects with keys: name, description.`;

        const response = await client.messages.create({
            model: 'z-ai/glm4.7',
            max_tokens: 1000,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response format from NVIDIA API');
        }

        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('[nvidia-client] Failed to extract JSON from suggestion response:', content.text);
            throw new Error('Failed to parse suggestions from API response');
        }

        const suggestions = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(suggestions)) {
            throw new Error('Invalid suggestions format from NVIDIA API');
        }

        return suggestions;
    } catch (error) {
        console.error('[nvidia-client] Error generating skill suggestions:', error);
        throw error;
    }
};

/**
 * Score user responses and determine skill level
 */
export const scoreAssessment = async (
    skill: string,
    questions: Array<{ question: string; options: string[] }>,
    userAnswers: string[],
    interestDomain?: string
): Promise<{ score: number; level: 'Beginner' | 'Intermediate' | 'Expert'; feedback: string }> => {
    try {
        const client = createNvidiaClient();
        
        const questionsStr = questions.map((q, i) => 
            `Q${i + 1}: ${q.question}\nUser answer: ${userAnswers[i] || 'Not answered'}`
        ).join('\n\n');

        const prompt = `You are an expert skill assessor. Evaluate the following assessment responses for the skill "${skill}" (context: ${interestDomain || 'general'}).

Assessment Questions and Responses:
${questionsStr}

Based on these responses:
1. Calculate a score from 0-100
2. Determine skill level: Beginner (0-40), Intermediate (41-75), Expert (76-100)
3. Provide brief constructive feedback

Return ONLY valid JSON:
{
  "score": <0-100>,
  "level": "Beginner|Intermediate|Expert",
  "feedback": "Brief feedback about their responses"
}

DO NOT include markdown code blocks or any text outside the JSON object.`;

        const response = await client.messages.create({
            model: 'z-ai/glm4.7',
            max_tokens: 500,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response format');
        }

        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse scoring response');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('[nvidia-client] Error scoring assessment:', error);
        throw error;
    }
};

/**
 * Generate personalized roadmap using NVIDIA API
 */
export const generateRoadmap = async (
    skill: string,
    userLevel: 'Beginner' | 'Intermediate' | 'Expert',
    interestDomain: string,
    weeks: number = 12,
    datasetContext?: string
): Promise<Array<{ week: number; theme: string; goals: string[]; resources: string[] }>> => {
    try {
        const client = createNvidiaClient();
        
        const prompt = `You are an expert learning path designer. Create a personalized ${weeks}-week learning roadmap for "${skill}" at ${userLevel} level within "${interestDomain}".

${datasetContext ? `Available resources and courses (reference only):\n${datasetContext}\n` : ''}

Requirements:
1. Create exactly ${weeks} weeks of structured learning
2. Each week should have: theme, 3-4 specific goals, 2-3 resource recommendations
3. Progress from ${userLevel === 'Beginner' ? 'fundamentals to applications' : userLevel === 'Intermediate' ? 'advanced concepts to implementation' : 'system design to expertise'}
4. Include mix of: videos, articles, practice exercises, projects
5. Be realistic and actionable
6. Include project milestones every 3-4 weeks

Return ONLY valid JSON array (no markdown):
[
  {
    "week": 1,
    "theme": "Introduction to X",
    "goals": ["Understand basics", "Set up environment", "Complete first task"],
    "resources": ["Resource A", "Resource B", "Resource C"]
  }
]

DO NOT include markdown code blocks or any text outside the JSON array.`;

        const response = await client.messages.create({
            model: 'z-ai/glm4.7',
            max_tokens: 3000,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response format');
        }

        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('[nvidia-client] Failed to extract JSON from roadmap:', content.text);
            throw new Error('Failed to parse roadmap');
        }

        const roadmap = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(roadmap)) {
            throw new Error('Invalid roadmap format');
        }

        return roadmap;
    } catch (error) {
        console.error('[nvidia-client] Error generating roadmap:', error);
        throw error;
    }
};

/**
 * Generate career recommendations based on user profile
 */
export const generateCareerRecommendations = async (
    skill: string,
    userLevel: 'Beginner' | 'Intermediate' | 'Expert',
    interestDomain: string,
    datasetContext?: string
): Promise<Array<{ title: string; description: string; salaryRange: string; growth: string }>> => {
    try {
        const client = createNvidiaClient();
        
        const prompt = `You are a career advisor. Based on expertise in "${skill}" at ${userLevel} level within "${interestDomain}", recommend 5 relevant career paths.

${datasetContext ? `Job market context:\n${datasetContext}\n` : ''}

For each career, provide:
1. Job title
2. Brief description of role
3. Typical salary range
4. Growth prospects

Return ONLY valid JSON array (no markdown):
[
  {
    "title": "Job Title",
    "description": "What this role involves",
    "salaryRange": "$XXk-$XXk USD",
    "growth": "Career growth prospects"
  }
]

DO NOT include markdown code blocks or any text outside the JSON array.`;

        const response = await client.messages.create({
            model: 'z-ai/glm4.7',
            max_tokens: 1500,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response format');
        }

        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('Failed to parse career recommendations');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('[nvidia-client] Error generating career recommendations:', error);
        throw error;
    }
};

// Legacy stub functions for backward compatibility
export const updateUserProfile = async (userId: string, updates: Record<string, unknown>) => {
    console.log('[nvidia-client] updateUserProfile', userId, updates);
    return { ok: true };
};

export const requestAssessment = async (userId: string, payload: Record<string, unknown>): Promise<AssessmentResult> => {
    console.log('[nvidia-client] requestAssessment', userId, payload);
    return { id: `assess_${Date.now()}`, status: 'pending' };
};

export const getAssessmentResult = async (assessmentId: string): Promise<AssessmentResult> => {
    console.log('[nvidia-client] getAssessmentResult', assessmentId);
    return { id: assessmentId, status: 'completed', score: 75 };
};

// Gemini Service - Now wired to NVIDIA API through backend proxy routes
import { postJson } from './apiService';

const callAi = async (prompt: string): Promise<string> => {
	const result = await postJson<{ response: string }>('/ai/generate', { prompt });
	return String(result.response || '');
};

/**
 * Get skill suggestions based on user input
 */
export const getSkillSuggestions = async (profile: any) => {
	const rawSkills = String(profile?.skills || '')
		.split(',')
		.map((s: string) => s.trim())
		.filter(Boolean);

	const interest = String(profile?.interests || 'General').trim();
	const seedSkills = rawSkills.length > 0
		? rawSkills
		: ['Problem Solving', 'Communication', 'Data Literacy'];

	const skill = rawSkills.join(', ') || seedSkills[0];

	try {
		const response = await postJson<{ suggestions: Array<{ name: string; description: string }> }>('/skill-suggestions', {
			skill,
			interestDomain: interest,
		});

		if (Array.isArray(response.suggestions) && response.suggestions.length > 0) {
			return response.suggestions;
		}
	} catch (error) {
		console.warn('[geminiService] Skill suggestions backend failed:', error);
	}

	const unique = Array.from(new Set(rawSkills.length > 0 ? rawSkills : seedSkills));

	return unique.slice(0, 6).map((name) => ({
		name,
		description: `Practical ${name} roadmap tailored for ${interest}. Focus: hands-on milestones and weekly progress.`,
	}));
};

/**
 * Generate rapid assessment questions using NVIDIA API
 */
export const getRapidAssessment = async (skill: string, interestDomain?: string) => {
	try {
		if (!skill?.trim()) {
			throw new Error('Skill name is required');
		}

		const domain = interestDomain?.trim() || 'General';

		console.log('[geminiService] Generating assessment for:', { skill, domain });
		
		const prompt = `You are an expert assessment designer. Generate exactly 5 assessment questions for "${skill}" in the context of "${domain}". Return a valid JSON array with question, options, and correctAnswer. Do not include markdown.`;
		const responseText = await callAi(prompt);

		const match = responseText.match(/\[[\s\S]*\]/);
		if (!match) {
			throw new Error('Failed to parse assessment response');
		}

		const questions = JSON.parse(match[0]);
		if (!Array.isArray(questions) || questions.length === 0) {
			throw new Error('Failed to generate assessment questions');
		}

		console.log('[geminiService] Assessment generated:', questions.length, 'questions');
		return questions;
	} catch (error) {
		console.error('[geminiService] Error generating assessment:', error);
		// Fallback to basic questions
		return [
			{
				question: `How comfortable are you with ${skill} basics?`,
				options: ['Not at all', 'Somewhat', 'Comfortable', 'Very comfortable'],
				correctAnswer: '__SELF_RATING__',
			},
			{
				question: `Which statement best describes ${skill}?`,
				options: ['A framework only', 'A programming language', 'A domain/skill area', 'None of these'],
				correctAnswer: 'A domain/skill area',
			},
			{
				question: `How often do you practice tasks related to ${skill}?`,
				options: ['Rarely', 'Monthly', 'Weekly', 'Daily'],
				correctAnswer: '__SELF_RATING__',
			},
		];
	}
};

/**
 * Get mock interview questions (now using NVIDIA)
 */
export const getMockInterview = async (role?: string) => {
	try {
		if (!role?.trim()) {
			return { questions: [] };
		}

		const prompt = `Generate 5 realistic interview questions for a ${role} position. Return only a JSON array of strings.`;
		const responseText = await callAi(prompt);
		const match = responseText.match(/\[[\s\S]*\]/);
		if (match) {
			return { questions: JSON.parse(match[0]) };
		}

		return { questions: [] };
	} catch (error) {
		console.error('[geminiService] Error generating mock interview:', error);
		return { questions: [] };
	}
};

/**
 * Get ELI5 explanation (Explain Like I'm 5)
 */
export const getELI5 = async (skill: string, theme?: string) => {
	try {
		const prompt = `Explain \"${skill}\"${theme ? ` in the context of ${theme}` : ''} like I'm 5 years old. Keep it simple, fun, and use everyday examples. Return only the explanation text.`;
		const responseText = await callAi(prompt);
		return { text: responseText.trim() };
	} catch (error) {
		console.error('[geminiService] Error generating ELI5:', error);
		return { text: '' };
	}
};

/**
 * Get real-world scenarios
 */
export const getRealWorldScenarios = async (skill: string, theme?: string) => {
	try {
		const prompt = `Generate 3 real-world scenarios where "${skill}"${theme ? ` (in ${theme})` : ''} is used. For each, describe: situation, how the skill is applied, and the outcome. Return only a JSON array.`;
		const responseText = await callAi(prompt);
		const match = responseText.match(/\[[\s\S]*\]/);
		if (match) {
			return { scenarios: JSON.parse(match[0]) };
		}

		return { scenarios: [] };
	} catch (error) {
		console.error('[geminiService] Error generating scenarios:', error);
		return { scenarios: [] };
	}
};

/**
 * Generate quiz questions
 */
export const getQuiz = async (skill: string, theme?: string) => {
	try {
		const prompt = `Create a 5-question quiz about "${skill}"${theme ? ` (${theme})` : ''}. Include multiple choice questions with 4 options each. Return only a JSON array of objects with question, options, and correctAnswer.`;
		const responseText = await callAi(prompt);
		const match = responseText.match(/\[[\s\S]*\]/);
		if (match) {
			return { questions: JSON.parse(match[0]) };
		}
		return { questions: [] };
	} catch (error) {
		console.error('[geminiService] Error generating quiz:', error);
		return { questions: [] };
	}
};

export const getWeekAssessment = async (skill: string, theme?: string) => ({ assessment: [] });
export const getFlashcards = async (skill: string, theme?: string) => ({ cards: [] });
export const getConceptConnections = async (skill: string, theme?: string) => ({ connections: [] });
export const getDebateTopic = async (skill: string, theme?: string) => ({ topic: '' });

/**
 * Get deep dive content
 */
export const getDeepDive = async (skill: string) => {
	try {
		const prompt = `Create a comprehensive deep dive for "${skill}". Include: what it is, why it's useful, why one should learn it, prerequisites, and advanced topics. Return only a JSON object with keys: what_is_it, why_useful, why_learn.`;
		const responseText = await callAi(prompt);
		const match = responseText.match(/\{[\s\S]*\}/);
		if (match) {
			return { content: JSON.stringify(JSON.parse(match[0])) };
		}
		return { content: '' };
	} catch (error) {
		console.error('[geminiService] Error generating deep dive:', error);
		return { content: '' };
	}
};

export const getSetupGuide = async (skill: string) => ({ steps: [] });
export const getCareerDetails = async (careerTitle: string, skill?: string) => ({ details: {} });

/**
 * Get career recommendations using NVIDIA
 */
export const getCareerRecommendation = async (profile: any) => {
	try {
		const skill = String(profile?.skills || '').split(',')[0]?.trim() || 'General';
		const domain = String(profile?.interests || 'General').trim();
		const level = profile?.skillLevel || 'Intermediate';

		if (!skill) {
			return { recommendations: [] };
		}

		console.log('[geminiService] Getting career recommendations for:', { skill, domain, level });
		const responseText = await callAi(`Provide 3 career recommendations for a ${level} learner interested in ${skill} within ${domain}. Return only a JSON array of recommendations with title, reason, and next_steps.`);
		const match = responseText.match(/\[[\s\S]*\]/);
		if (match) {
			return { recommendations: JSON.parse(match[0]) };
		}
		return { recommendations: [] };
	} catch (error) {
		console.error('[geminiService] Error getting career recommendations:', error);
		return { recommendations: [] };
	}
};

export const getTimelineEvents = async (profile: any, skill?: string) => [];
export const getHelpForStuck = async (skill: string, theme: string, problem: string) => ({ advice: '' });
export const getProjectSuggestions = async (skill: string, interests?: string) => [];
export const getProjectDetails = async (skill: string, projectTitle: string) => ({ description: '' });
export const getToughness = async (skill: string) => ({ level: 'medium' });
export const getOfflineCenters = async (skill: string) => [];

/**
 * Get career paths based on skill
 */
export const getCareerPaths = async (skill: string, resumeText?: string) => {
	try {
		const prompt = `Based on the skill "${skill}"${resumeText ? ', and considering this resume: ' + resumeText : ''}, suggest 5 possible career paths. For each, provide: career title, description, required skills, growth potential. Return only a JSON array.`;
		const responseText = await callAi(prompt);
		const match = responseText.match(/\[[\s\S]*\]/);
		if (match) {
			return JSON.parse(match[0]);
		}
	} catch (error) {
		console.error('[geminiService] Error getting career paths:', error);
	}

	return [];
};

export const getAcademicSuggestions = async (profile: any) => [];
export const analyzeResume = async (text: string) => ({ summary: '' });
export const getAiCoachResponse = async (skill: string, message: string) => ({ reply: '' });
export const getDebateRebuttal = async (history: any[]) => ({ rebuttal: '' });
export const getSkillLevelQuiz = async (skill: string) => ({ questions: [] });

/**
 * Get job trend data
 */
export const getJobTrendData = async (skill: string) => {
	try {
		const prompt = `Provide job market trends for "${skill}". Include: demand level (high/medium/low), growth rate (%), average salary range, and top companies hiring. Return only a JSON object.`;
		const responseText = await callAi(prompt);
		const match = responseText.match(/\{[\s\S]*\}/);
		if (match) {
			return { trend: [JSON.parse(match[0])] };
		}
	} catch (error) {
		console.error('[geminiService] Error getting job trends:', error);
	}

	return { trend: [] };
};

export default {};

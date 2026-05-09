/**
 * Frontend Assessment API Service
 * Calls backend endpoints for assessment/roadmap/career generation
 * Backend loads datasets and includes them as context in NVIDIA prompts
 */

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3004';

export interface AssessmentQuestion {
  question: string;
  options: string[];
  correctAnswer?: string;
}

export interface RoadmapWeek {
  week: number;
  theme: string;
  goals: string[];
  resources: string[];
}

export interface CareerRecommendation {
  title: string;
  description: string;
  salaryRange: string;
  growth: string;
}

export interface SkillSuggestion {
  name: string;
  description: string;
}

/**
 * Generate assessment questions with dataset context
 */
export const generateAssessment = async (
  skill: string,
  interestDomain: string,
): Promise<AssessmentQuestion[]> => {
  try {
    if (!skill?.trim() || !interestDomain?.trim()) {
      throw new Error('Skill and interest domain are required');
    }

    console.log('[assessmentApiService] Generating assessment:', { skill, interestDomain });

    const response = await fetch(`${BACKEND_URL}/api/assessment/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skill, interestDomain }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to generate assessment (${response.status})`,
      );
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.questions)) {
      throw new Error('Invalid assessment response format');
    }

    console.log('[assessmentApiService] Assessment generated:', data.questions.length, 'questions');
    return data.questions;
  } catch (error) {
    console.error('[assessmentApiService] Error generating assessment:', error);
    throw error;
  }
};

/**
 * Generate skill suggestions based on dataset context
 */
export const generateSkillSuggestions = async (
  skill: string,
  interestDomain: string,
): Promise<SkillSuggestion[]> => {
  try {
    if (!skill?.trim() || !interestDomain?.trim()) {
      return [];
    }

    console.log('[assessmentApiService] Fetching skill suggestions:', { skill, interestDomain });

    const response = await fetch(`${BACKEND_URL}/api/skill-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skill, interestDomain }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to fetch skill suggestions (${response.status})`,
      );
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.suggestions)) {
      throw new Error('Invalid skill suggestions response format');
    }

    return data.suggestions;
  } catch (error) {
    console.error('[assessmentApiService] Error fetching skill suggestions:', error);
    return [];
  }
};

/**
 * Score assessment answers
 */
export const scoreAssessment = async (
  skill: string,
  questions: AssessmentQuestion[],
  answers: string[],
  interestDomain: string,
): Promise<{ score: number; level: 'Beginner' | 'Intermediate' | 'Expert'; feedback: string }> => {
  try {
    if (!skill || !Array.isArray(questions) || !Array.isArray(answers)) {
      throw new Error('Invalid parameters for scoring');
    }

    console.log('[assessmentApiService] Scoring assessment');

    const response = await fetch(`${BACKEND_URL}/api/roadmap/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skill, questions, answers, interestDomain }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to score assessment (${response.status})`,
      );
    }

    const data = await response.json();

    if (!data.success || typeof data.score !== 'number' || !data.level) {
      throw new Error('Invalid scoring response');
    }

    console.log('[assessmentApiService] Assessment scored:', {
      score: data.score,
      level: data.level,
    });

    return {
      score: data.score,
      level: data.level,
      feedback: data.feedback || 'Keep learning!',
    };
  } catch (error) {
    console.error('[assessmentApiService] Error scoring assessment:', error);
    throw error;
  }
};

/**
 * Generate personalized roadmap
 */
export const generateRoadmap = async (
  skill: string,
  userLevel: 'Beginner' | 'Intermediate' | 'Expert',
  interestDomain: string,
  weeks: number = 12,
): Promise<RoadmapWeek[]> => {
  try {
    if (!skill || !userLevel || !interestDomain) {
      throw new Error('Skill, level, and interest domain are required');
    }

    console.log('[assessmentApiService] Generating roadmap:', {
      skill,
      userLevel,
      interestDomain,
      weeks,
    });

    const response = await fetch(`${BACKEND_URL}/api/roadmap/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skill, userLevel, interestDomain, weeks }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to generate roadmap (${response.status})`,
      );
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.roadmap)) {
      throw new Error('Invalid roadmap response format');
    }

    console.log('[assessmentApiService] Roadmap generated:', data.roadmap.length, 'weeks');
    return data.roadmap;
  } catch (error) {
    console.error('[assessmentApiService] Error generating roadmap:', error);
    throw error;
  }
};

/**
 * Generate career recommendations
 */
export const generateCareerRecommendations = async (
  skill: string,
  userLevel: 'Beginner' | 'Intermediate' | 'Expert',
  interestDomain: string,
): Promise<CareerRecommendation[]> => {
  try {
    if (!skill || !userLevel || !interestDomain) {
      throw new Error('Skill, level, and interest domain are required');
    }

    console.log('[assessmentApiService] Generating career recommendations');

    const response = await fetch(`${BACKEND_URL}/api/career/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skill, userLevel, interestDomain }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to generate career recommendations (${response.status})`,
      );
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.recommendations)) {
      throw new Error('Invalid career recommendations response');
    }

    console.log('[assessmentApiService] Career recommendations generated:', data.recommendations.length);
    return data.recommendations;
  } catch (error) {
    console.error('[assessmentApiService] Error generating career recommendations:', error);
    throw error;
  }
};

export default {
  generateAssessment,
  scoreAssessment,
  generateRoadmap,
  generateCareerRecommendations,
};

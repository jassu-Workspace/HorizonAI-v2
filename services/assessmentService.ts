import { RapidQuestion } from '../types';

/**
 * UNIFIED ASSESSMENT SERVICE
 * =========================
 * Centralizes all assessment logic, scoring, validation, and configuration.
 * This ensures consistency across the entire assessment flow.
 */

// ============================================
// 1. UNIFIED ASSESSMENT CONFIGURATION
// ============================================

export const ASSESSMENT_CONFIG = {
  RAPID_ASSESSMENT: {
    MIN_QUESTIONS: 8,
    TARGET_QUESTIONS: 10,
    TIMEOUT_MS: 300000, // 5 minutes total
    MODEL: "mistralai/mistral-7b-instruct-v0.2",
    TEMPERATURE: 0.2,
    TOP_P: 0.6,
  },
  SCORING: {
    LEVEL_THRESHOLDS: {
      EXPERT: { min: 71, max: 100 },
      INTERMEDIATE: { min: 40, max: 70 },
      BEGINNER: { min: 0, max: 39 },
    },
    WEEKS_BY_LEVEL: {
      BEGINNER: 12,
      INTERMEDIATE: 8,
      EXPERT: 4,
    },
  },
  CACHE: {
    TTL_MS: 5 * 60 * 1000,
  },
} as const;

export const SELF_RATING_SENTINEL = '__self_rating__';

// ============================================
// 2. TYPE DEFINITIONS
// ============================================

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Expert';

export type AssessmentValidationError = {
  field: string;
  issue: string;
  value?: unknown;
};

export interface ValidationResult {
  isValid: boolean;
  errors: AssessmentValidationError[];
}

export interface ScoreCalculationResult {
  score: number;
  maxScore: number;
  percentage: number;
  level: SkillLevel;
  breakdown: {
    correctCount: number;
    wrongCount: number;
    skippedCount: number;
    selfRatingScore: number;
    regularScore: number;
  };
}

// ============================================
// 3. VALIDATION FUNCTIONS
// ============================================

/**
 * Validate a single rapid assessment question
 * Ensures all required fields are present and properly formatted
 */
export const validateRapidQuestion = (q: unknown, index: number): ValidationResult => {
  const errors: AssessmentValidationError[] = [];
  const question = q as any;

  // Validate question text
  if (typeof question?.question !== 'string' || question.question.trim().length === 0) {
    errors.push({
      field: `question[${index}].question`,
      issue: 'Must be non-empty string',
      value: question?.question,
    });
  } else if (question.question.length > 500) {
    errors.push({
      field: `question[${index}].question`,
      issue: 'Exceeds 500 character limit',
      value: question.question.length,
    });
  }

  // Validate options array
  if (!Array.isArray(question?.options) || question.options.length === 0) {
    errors.push({
      field: `question[${index}].options`,
      issue: 'Must be non-empty array',
      value: question?.options,
    });
  } else if (question.options.length < 2 || question.options.length > 4) {
    errors.push({
      field: `question[${index}].options`,
      issue: 'Must have 2-4 unique options',
      value: question.options.length,
    });
  } else {
    // Validate each option
    const uniqueOptions = new Set<string>();
    const optionsArray = question.options as unknown[];

    optionsArray.forEach((opt: unknown, optIdx: number) => {
      const optStr = String(opt || '').trim();

      if (optStr.length === 0) {
        errors.push({
          field: `question[${index}].options[${optIdx}]`,
          issue: 'Empty or null option',
        });
      } else if (optStr.length > 200) {
        errors.push({
          field: `question[${index}].options[${optIdx}]`,
          issue: 'Option exceeds 200 character limit',
          value: optStr.length,
        });
      } else if (uniqueOptions.has(optStr.toLowerCase())) {
        errors.push({
          field: `question[${index}].options[${optIdx}]`,
          issue: `Duplicate option: "${optStr}"`,
          value: optStr,
        });
      } else {
        uniqueOptions.add(optStr.toLowerCase());
      }
    });
  }

  // Validate correct answer
  if (typeof question?.correctAnswer !== 'string' || question.correctAnswer.trim().length === 0) {
    errors.push({
      field: `question[${index}].correctAnswer`,
      issue: 'Must be non-empty string',
    });
  } else if (
    question.correctAnswer !== SELF_RATING_SENTINEL &&
    !question.options?.includes(question.correctAnswer)
  ) {
    errors.push({
      field: `question[${index}].correctAnswer`,
      issue: 'Answer must match one of the options exactly',
      value: question.correctAnswer,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate entire assessment response from API
 * Checks structure, question count, and each question's validity
 */
export const validateAssessmentResponse = (data: unknown): ValidationResult => {
  const errors: AssessmentValidationError[] = [];

  if (!data) {
    errors.push({
      field: 'root',
      issue: 'Assessment response is null or undefined',
    });
    return { isValid: false, errors };
  }

  const dataObj = data as any;

  // Extract questions from various possible formats
  const questions = Array.isArray(dataObj?.quiz)
    ? dataObj.quiz
    : Array.isArray(dataObj?.questions)
      ? dataObj.questions
      : Array.isArray(dataObj)
        ? dataObj
        : [];

  if (questions.length === 0) {
    errors.push({
      field: 'quiz|questions',
      issue: 'No questions found in response',
    });
    return { isValid: false, errors };
  }

  if (questions.length < ASSESSMENT_CONFIG.RAPID_ASSESSMENT.MIN_QUESTIONS) {
    errors.push({
      field: 'quiz.length',
      issue: `Minimum ${ASSESSMENT_CONFIG.RAPID_ASSESSMENT.MIN_QUESTIONS} questions required`,
      value: `Got ${questions.length}`,
    });
  }

  // Validate each question
  questions.forEach((q: unknown, idx: number) => {
    const result = validateRapidQuestion(q, idx);
    if (!result.isValid) {
      errors.push(...result.errors);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate user input before making API calls
 */
export const validateAssessmentInput = (skillName: unknown, interestDomain: unknown): ValidationResult => {
  const errors: AssessmentValidationError[] = [];

  if (!skillName || typeof skillName !== 'string' || skillName.trim().length === 0) {
    errors.push({
      field: 'skillName',
      issue: 'Skill name is required and must be non-empty',
    });
  } else if (skillName.length > 200) {
    errors.push({
      field: 'skillName',
      issue: 'Skill name exceeds 200 characters',
      value: skillName.length,
    });
  }

  if (!interestDomain || typeof interestDomain !== 'string' || interestDomain.trim().length === 0) {
    errors.push({
      field: 'interestDomain',
      issue: 'Interest domain is required and must be non-empty',
    });
  } else if (interestDomain.length > 200) {
    errors.push({
      field: 'interestDomain',
      issue: 'Interest domain exceeds 200 characters',
      value: interestDomain.length,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================
// 4. SCORE CALCULATION WITH EXPLICIT LOGIC
// ============================================

/**
 * Calculate assessment score given questions and answers
 * Handles both regular questions and self-rating questions with proper weighting
 */
export const calculateAssessmentScore = (
  questions: RapidQuestion[],
  selectedAnswers: (string | null)[],
): ScoreCalculationResult => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Cannot calculate score: questions array is empty or invalid');
  }

  if (!Array.isArray(selectedAnswers)) {
    throw new Error('Cannot calculate score: selectedAnswers must be an array');
  }

  if (selectedAnswers.length !== questions.length) {
    throw new Error(
      `Answer count mismatch: expected ${questions.length} answers, got ${selectedAnswers.length}`,
    );
  }

  let regularScore = 0;
  let regularMaxScore = 0;
  let selfRatingScore = 0;
  let selfRatingMaxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  questions.forEach((question, index) => {
    const answer = selectedAnswers[index];
    const isSelfRating = question.correctAnswer === SELF_RATING_SENTINEL;

    if (!answer) {
      skippedCount++;
      if (isSelfRating) {
        selfRatingMaxScore += 3; // Max 3 points for self-rating
      } else {
        regularMaxScore += 1;
      }
      return;
    }

    if (isSelfRating) {
      // Self-rating: map option index to score (0, 1, 2, or 3)
      const optionIndex = question.options.indexOf(answer);
      if (optionIndex >= 0) {
        selfRatingScore += optionIndex;
        selfRatingMaxScore += 3;
      } else {
        // Invalid answer selection
        selfRatingMaxScore += 3;
      }
    } else {
      // Regular question: 1 point for correct, 0 for wrong
      if (answer === question.correctAnswer) {
        regularScore += 1;
        correctCount++;
      } else {
        wrongCount++;
      }
      regularMaxScore += 1;
    }
  });

  const totalScore = regularScore + selfRatingScore;
  const maxScore = regularMaxScore + selfRatingMaxScore;
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  // Determine level using unified thresholds
  let level: SkillLevel = 'Beginner';
  if (percentage > ASSESSMENT_CONFIG.SCORING.LEVEL_THRESHOLDS.EXPERT.min) {
    level = 'Expert';
  } else if (percentage >= ASSESSMENT_CONFIG.SCORING.LEVEL_THRESHOLDS.INTERMEDIATE.min) {
    level = 'Intermediate';
  }

  return {
    score: totalScore,
    maxScore,
    percentage: Math.round(percentage * 100) / 100, // 2 decimal places
    level,
    breakdown: {
      correctCount,
      wrongCount,
      skippedCount,
      selfRatingScore,
      regularScore,
    },
  };
};

// ============================================
// 5. CACHE KEY GENERATION
// ============================================

/**
 * Generate consistent cache key for assessment questions
 * Prevents race conditions and ensures cache hits
 */
export const buildCacheKey = (skillName: string, domainName: string): string => {
  const normalize = (s: string) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_') // Replace whitespace with underscore
      .replace(/[^a-z0-9_]/g, ''); // Remove special characters

  const skill = normalize(skillName);
  const domain = normalize(domainName || 'general');

  if (!skill) {
    throw new Error('Invalid cache key: skill name normalized to empty string');
  }
  if (!domain) {
    throw new Error('Invalid cache key: domain name normalized to empty string');
  }

  return `assessment::${skill}::${domain}`;
};

// ============================================
// 6. LEVEL & WEEKS DETERMINATION
// ============================================

/**
 * Get roadmap duration (weeks) based on skill level
 * Centralized logic to prevent inconsistencies
 */
export const getWeeksForLevel = (level: SkillLevel): number => {
  if (!level || typeof level !== 'string') {
    throw new Error(`Invalid level: expected string, got ${typeof level}`);
  }

  const weeksMap = ASSESSMENT_CONFIG.SCORING.WEEKS_BY_LEVEL;

  if (!(level in weeksMap)) {
    throw new Error(`Unknown skill level: ${level}. Must be one of: Beginner, Intermediate, Expert`);
  }

  const weeks = weeksMap[level as keyof typeof weeksMap];

  if (!weeks || weeks < 1 || weeks > 52) {
    throw new Error(`Invalid weeks value: ${weeks}. Must be between 1 and 52.`);
  }

  return weeks;
};

/**
 * Get skill level from percentage score
 * Uses unified thresholds across the entire app
 */
export const getLevelFromPercentage = (percentage: number): SkillLevel => {
  if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
    throw new Error(`Invalid percentage: ${percentage}. Must be between 0 and 100.`);
  }

  if (percentage > ASSESSMENT_CONFIG.SCORING.LEVEL_THRESHOLDS.EXPERT.min) {
    return 'Expert';
  }

  if (percentage >= ASSESSMENT_CONFIG.SCORING.LEVEL_THRESHOLDS.INTERMEDIATE.min) {
    return 'Intermediate';
  }

  return 'Beginner';
};

// ============================================
// 7. ERROR HANDLING & LOGGING
// ============================================

/**
 * Centralized error logging for assessment operations
 * Formats error messages consistently and includes context
 */
export const logAssessmentError = (
  context: string,
  error: unknown,
  details?: Record<string, unknown>,
): void => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const errorLog = {
    timestamp: new Date().toISOString(),
    context: `[Assessment:${context}]`,
    message,
    stack,
    details,
  };

  console.error(errorLog.context, message, { ...errorLog, stack });

  // TODO: Send to error tracking service (Sentry, DataDog, etc.)
  // TODO: Send to analytics for assessment metrics
};

/**
 * Format validation errors into user-friendly message
 */
export const formatValidationErrors = (errors: AssessmentValidationError[]): string => {
  if (errors.length === 0) {
    return 'An unknown validation error occurred.';
  }

  const firstError = errors[0];
  return `Validation failed at ${firstError.field}: ${firstError.issue}`;
};

// ============================================
// 8. UTILITY FUNCTIONS
// ============================================

/**
 * Check if a question is a self-rating question
 */
export const isSelfRatingQuestion = (question: RapidQuestion): boolean => {
  return question.correctAnswer === SELF_RATING_SENTINEL;
};

/**
 * Get percentage from score
 */
export const getPercentageFromScore = (score: number, maxScore: number): number => {
  if (maxScore <= 0) {
    throw new Error('Max score must be greater than 0');
  }
  if (score < 0 || score > maxScore) {
    throw new Error(`Score (${score}) must be between 0 and ${maxScore}`);
  }
  return Math.round((score / maxScore) * 10000) / 100; // 2 decimal precision
};

/**
 * Clone questions array safely (prevents mutations)
 */
export const cloneQuestions = (questions: RapidQuestion[]): RapidQuestion[] => {
  return questions.map((q) => ({
    question: q.question,
    options: [...q.options],
    correctAnswer: q.correctAnswer,
  }));
};

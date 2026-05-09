export const SELF_RATING_SENTINEL = '__SELF_RATING__';

type SkillLevel = 'Beginner' | 'Intermediate' | 'Expert';

export const logAssessmentError = (context: string, error: unknown, meta?: Record<string, unknown>) => {
	if (error) {
		console.warn('[assessment]', context, error, meta || {});
		return;
	}
	console.info('[assessment]', context, meta || {});
};

export const getPercentageFromScore = (score: number, total = 10) => {
	if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return 0;
	return Math.max(0, Math.min(100, (score / total) * 100));
};

export const getLevelFromPercentage = (percentage: number): SkillLevel => {
	if (percentage >= 75) return 'Expert';
	if (percentage >= 40) return 'Intermediate';
	return 'Beginner';
};

export const getWeeksForLevel = (level: SkillLevel): number => {
	if (level === 'Expert') return 8;
	if (level === 'Intermediate') return 12;
	return 16;
};

export const isSelfRatingQuestion = (question: { correctAnswer?: string }) =>
	String(question?.correctAnswer || '').trim() === SELF_RATING_SENTINEL;

export const validateRapidQuestion = (question: any, index = 0) => {
	const errors: Array<{ field: string; issue: string }> = [];

	if (!question || typeof question !== 'object') {
		errors.push({ field: 'question', issue: `Question ${index + 1} must be an object` });
	}

	if (!String(question?.question || '').trim()) {
		errors.push({ field: 'question', issue: `Question ${index + 1} text is required` });
	}

	if (!Array.isArray(question?.options) || question.options.length < 2) {
		errors.push({ field: 'options', issue: `Question ${index + 1} must have at least 2 options` });
	}

	const correctAnswer = String(question?.correctAnswer || '').trim();
	if (!correctAnswer) {
		errors.push({ field: 'correctAnswer', issue: `Question ${index + 1} must define correctAnswer` });
	} else if (correctAnswer !== SELF_RATING_SENTINEL && Array.isArray(question?.options) && !question.options.includes(correctAnswer)) {
		errors.push({ field: 'correctAnswer', issue: `Question ${index + 1} correctAnswer must exist in options` });
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

export const calculateAssessmentScore = (
	questions: Array<{ correctAnswer: string }> = [],
	selectedAnswers: Array<string | null> = [],
) => {
	const maxScore = questions.filter((q) => !isSelfRatingQuestion(q)).length;

	const score = questions.reduce((acc, question, index) => {
		if (isSelfRatingQuestion(question)) return acc;
		return selectedAnswers[index] === question.correctAnswer ? acc + 1 : acc;
	}, 0);

	const percentage = getPercentageFromScore(score, maxScore || 1);
	const level = getLevelFromPercentage(percentage);

	return { score, maxScore, percentage, level };
};

export default {
	SELF_RATING_SENTINEL,
	logAssessmentError,
	getPercentageFromScore,
	getLevelFromPercentage,
	getWeeksForLevel,
	isSelfRatingQuestion,
	validateRapidQuestion,
	calculateAssessmentScore,
};

import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { saveQuizResult } from '../services/supabaseService';
import { logAssessmentError, getPercentageFromScore } from '../services/assessmentService';

interface QuizModalProps {
    questions: QuizQuestion[];
    roadmapId?: string;
    skill?: string;
    theme?: string;
    weekIndex?: number;
    startedAt?: string;
}

// Constants
const MAX_BASE_POINTS = 100;
const OPTIMAL_DAYS_MIN = 7;
const OPTIMAL_DAYS_MAX = 9;
const EARLY_SUBMISSION_MULTIPLIER = 0.5;
const LATE_DAY_PENALTY = 10;
const MINIMUM_POINTS_FLOOR = 10;

/**
 * Calculate points based on score and submission timing
 */
const calculatePoints = (
  baseScore: number,
  totalQuestions: number,
  startedAt?: string,
): number => {
  // Guard clauses
  if (!startedAt || baseScore === 0) {
    return 0;
  }

  if (baseScore < 0 || baseScore > totalQuestions || totalQuestions <= 0) {
    logAssessmentError('calculatePoints:invalid_input', 'Invalid score values', {
      baseScore,
      totalQuestions,
    });
    return 0;
  }

  try {
    // Calculate base points: 100 * (score / totalQuestions)
    const percentage = getPercentageFromScore(baseScore, totalQuestions);
    let points = MAX_BASE_POINTS * (percentage / 100);

    // Parse start date with validation
    const startDate = new Date(startedAt);
    if (isNaN(startDate.getTime())) {
      throw new Error(`Invalid start date: ${startedAt}`);
    }

    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Apply time-based multipliers
    if (diffDays < OPTIMAL_DAYS_MIN) {
      // Early submission: 50% penalty
      points = points * EARLY_SUBMISSION_MULTIPLIER;
    } else if (diffDays > OPTIMAL_DAYS_MAX) {
      // Late submission: -10 XP per day late
      const daysLate = diffDays - OPTIMAL_DAYS_MAX;
      const penalty = daysLate * LATE_DAY_PENALTY;
      points = Math.max(MINIMUM_POINTS_FLOOR, points - penalty);
    }
    // else: 7-9 days = optimal, no adjustment

    return Math.round(points);
  } catch (error) {
    logAssessmentError('calculatePoints:error', error, {
      baseScore,
      totalQuestions,
      startedAt,
    });
    return 0;
  }
};

/**
 * Calculate score from answers
 */
const getScore = (selectedAnswers: (string | null)[], questions: QuizQuestion[]): number => {
  if (!Array.isArray(selectedAnswers) || !Array.isArray(questions)) {
    return 0;
  }

  if (selectedAnswers.length !== questions.length) {
    logAssessmentError('getScore:mismatch', 'Answer count mismatch', {
      answerCount: selectedAnswers.length,
      questionCount: questions.length,
    });
    return 0;
  }

  return selectedAnswers.reduce((score, answer, index) => {
    if (!answer || !questions[index]) {
      return score;
    }
    return answer === questions[index].correctAnswer ? score + 1 : score;
  }, 0);
};

/**
 * Quiz Modal Component
 */
const QuizModal: React.FC<QuizModalProps> = ({
  questions,
  roadmapId,
  skill,
  theme,
  weekIndex,
  startedAt,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>(
    Array(questions.length).fill(null),
  );
  const [submitted, setSubmitted] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [timeMessage, setTimeMessage] = useState('');

  const handleSelectOption = (qIndex: number, option: string) => {
    if (submitted) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[qIndex] = option;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setSubmitted(true);

    try {
      const score = getScore(selectedAnswers, questions);

      // Ensure score is valid
      if (score < 0 || score > questions.length) {
        throw new Error(`Invalid score calculation: ${score}`);
      }

      let earned = 0;
      let calculatedTimeMessage = '';

      // Calculate points if we have timing data
      if (startedAt && roadmapId) {
        earned = calculatePoints(score, questions.length, startedAt);
        setPointsEarned(earned);

        // Generate time message
        const startDate = new Date(startedAt);
        const now = new Date();
        const diffMs = now.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < OPTIMAL_DAYS_MIN) {
          calculatedTimeMessage = `Early submission (Day ${diffDays + 1}). Points halved.`;
        } else if (diffDays > OPTIMAL_DAYS_MAX) {
          const daysLate = diffDays - OPTIMAL_DAYS_MAX;
          calculatedTimeMessage = `Late by ${daysLate} days (${daysLate * LATE_DAY_PENALTY} XP penalty applied).`;
        } else {
          calculatedTimeMessage = 'Perfect timing! Max XP awarded.';
        }
        setTimeMessage(calculatedTimeMessage);
      }

      // Save to DB with validation
      if (skill) {
        try {
          await saveQuizResult({
            skill,
            weekTheme: theme,
            score,
            totalQuestions: questions.length,
            timestamp: new Date().toISOString(),
            roadmapId,
            pointsEarned: earned,
          });
        } catch (error) {
          logAssessmentError('QuizModal:saveQuizResult', error, {
            skill,
            score,
            totalQuestions: questions.length,
          });
          // Don't block user - error is logged
        }
      }
    } catch (error) {
      logAssessmentError('QuizModal:handleSubmit', error);
      // Reset submitted state to allow retry
      setSubmitted(false);
    }
  };

  return (
    <div>
      {questions.map((q, qIndex) => (
        <div key={`quiz-q-${qIndex}`} className="mb-6">
          <p className="font-semibold text-slate-800 mb-3">
            {qIndex + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt) => {
              const isSelected = selectedAnswers[qIndex] === opt;
              let buttonClass =
                'bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700';
              if (submitted) {
                if (opt === q.correctAnswer) {
                  buttonClass = 'bg-green-200 border-green-400 text-green-800 font-semibold';
                } else if (isSelected && opt !== q.correctAnswer) {
                  buttonClass = 'bg-red-200 border-red-400 text-red-800';
                }
              } else if (isSelected) {
                buttonClass = 'bg-blue-500 border-blue-500 text-white font-semibold';
              }
              return (
                <button
                  key={`option-${qIndex}-${opt}`}
                  onClick={() => handleSelectOption(qIndex, opt)}
                  className={`block w-full text-left p-3 rounded-lg text-sm transition-colors ${buttonClass}`}
                  disabled={submitted}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted && (
        <div className="text-center mt-6">
          <button onClick={handleSubmit} className="dynamic-button">
            Submit Answers
          </button>
        </div>
      )}
      {submitted && (
        <div className="text-center mt-6 p-4 bg-slate-100 rounded-lg">
          <p className="font-bold text-xl text-slate-800">
            You scored {getScore(selectedAnswers, questions)} out of {questions.length}!
          </p>

          {pointsEarned > 0 && (
            <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-xl animate-bounce">
              <p className="text-amber-800 font-bold text-2xl">+{pointsEarned} XP Earned!</p>
              <p className="text-amber-700 text-sm">{timeMessage}</p>
            </div>
          )}

          <p className="text-xs text-green-600 mt-2">Result saved to your history.</p>
        </div>
      )}
    </div>
  );
};

export default QuizModal;

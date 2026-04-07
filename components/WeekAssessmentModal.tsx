import React, { useState } from 'react';
import { QuizQuestion, AssessmentResult } from '../types';
import { saveQuizResult } from '../services/supabaseService';
import { logAssessmentError, getPercentageFromScore } from '../services/assessmentService';

// Pass threshold: 50% of total questions
const PASS_THRESHOLD_PERCENTAGE = 50;

const calculatePassScore = (totalQuestions: number): number => {
  if (totalQuestions <= 0) {
    throw new Error('Invalid total questions count');
  }
  return Math.ceil((PASS_THRESHOLD_PERCENTAGE / 100) * totalQuestions);
};

const calculatePoints = (score: number, totalQuestions: number, isPassed: boolean): number => {
  if (!isPassed || score < 0 || score > totalQuestions) {
    return 0;
  }

  // Validate inputs
  try {
    if (totalQuestions <= 0) {
      throw new Error('Invalid total questions');
    }
    if (score > totalQuestions) {
      throw new Error('Score cannot exceed total questions');
    }

    // Points = 10 XP per correct answer
    let earned = score * 10;

    // Bonus: 50 XP for perfect score
    if (score === totalQuestions) {
      earned += 50;
    }

    return Math.max(0, Math.min(earned, 500)); // Cap at 500 XP
  } catch (error) {
    logAssessmentError('calculatePoints', error, { score, totalQuestions });
    return 0;
  }
};

interface WeekAssessmentModalProps {
    questions: QuizQuestion[];
    roadmapId?: string;
    skill: string;
    theme: string;
    weekIndex: number;
    roadmapStatus?: 'active' | 'saved' | 'completed';
    onPass: (result: AssessmentResult) => void;
    onClose: () => void;
}

const WeekAssessmentModal: React.FC<WeekAssessmentModalProps> = ({ 
    questions, 
    roadmapId, 
    skill, 
    theme, 
    weekIndex, 
    roadmapStatus,
    onPass,
    onClose 
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>(Array(questions.length).fill(null));
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [pointsEarned, setPointsEarned] = useState(0);

    const handleSelectOption = (option: string) => {
        if (submitted) return;
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestionIndex] = option;
        setSelectedAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setSubmitted(true);

        try {
          // Calculate score with validation
          const calculatedScore = selectedAnswers.reduce((acc, answer, index) => {
            if (!answer || !questions[index]) {
              return acc;
            }
            return answer === questions[index].correctAnswer ? acc + 1 : acc;
          }, 0);

          if (calculatedScore < 0 || calculatedScore > questions.length) {
            throw new Error(
              `Invalid score calculation: score=${calculatedScore}, total=${questions.length}`,
            );
          }

          setScore(calculatedScore);

          // Calculate pass status with dynamic threshold
          const passThreshold = calculatePassScore(questions.length);
          const passed = calculatedScore >= passThreshold;

          // Calculate points
          const earned = calculatePoints(calculatedScore, questions.length, passed && roadmapStatus === 'active');
          setPointsEarned(earned);

          // Save result to DB regardless of pass/fail
          if (roadmapId) {
            try {
              await saveQuizResult({
                skill,
                weekTheme: theme,
                score: calculatedScore,
                totalQuestions: questions.length,
                timestamp: new Date().toISOString(),
                roadmapId,
                pointsEarned: earned,
                assessmentType: 'assignment',
              });
            } catch (error) {
              logAssessmentError('WeekAssessmentModal:saveQuizResult', error, {
                skill,
                theme,
                score: calculatedScore,
                totalQuestions: questions.length,
              });
              // Don't block user - error is logged
            }
          }
        } catch (error) {
          logAssessmentError('WeekAssessmentModal:handleSubmit', error, {
            questionCount: questions.length,
          });
          setSubmitted(false);
        }
    };

    const currentQuestion = questions[currentQuestionIndex];
    const isAnswerSelected = !!selectedAnswers[currentQuestionIndex];

    if (submitted) {
        const passThreshold = calculatePassScore(questions.length);
        const passed = score >= passThreshold;
        return (
            <div className="text-center space-y-6 animate-fadeIn">
                <div className={`p-6 rounded-2xl border-4 ${passed ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                    <ion-icon name={passed ? "trophy" : "alert-circle"} className={`text-6xl mb-4 ${passed ? 'text-green-500' : 'text-red-500'}`}></ion-icon>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">{passed ? 'Assignment Passed!' : 'Assessment Failed'}</h2>
                    <p className="text-lg text-slate-600">You scored <span className="font-bold">{score}</span> / {questions.length}</p>

                    {passed ? (
                        <div className="mt-4">
                            <p className="text-slate-600">Great job! You have mastered this week's content.</p>
                            {pointsEarned > 0 && (
                                <div className="mt-4 inline-block bg-amber-100 text-amber-800 px-6 py-2 rounded-full font-bold border border-amber-300">
                                    +{pointsEarned} XP Earned
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="mt-4 text-slate-600">You need at least {passThreshold} correct answers to proceed ({PASS_THRESHOLD_PERCENTAGE}%). Please review the materials and try again.</p>
                    )}
                </div>

                {passed ? (
                    <button onClick={() => onPass({ passed: true, score, pointsAwarded: pointsEarned })} className="dynamic-button w-full">
                        Complete Week & Continue
                    </button>
                ) : (
                    <button onClick={onClose} className="dynamic-button bg-white text-slate-800 border border-slate-300 w-full">
                        Study Again
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-700">Week Assignment</h3>
                <span className="text-sm font-semibold bg-slate-100 px-3 py-1 rounded-full text-slate-500">
                    {currentQuestionIndex + 1} / {questions.length}
                </span>
            </div>

            <div className="flex-grow">
                <p className="text-xl font-bold text-slate-900 mb-6">{currentQuestion.question}</p>
                <div className="space-y-3">
                    {currentQuestion.options.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => handleSelectOption(opt)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                selectedAnswers[currentQuestionIndex] === opt
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                                    : 'border-slate-200 bg-white hover:border-blue-300 text-slate-700'
                            }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={!isAnswerSelected}
                    className="dynamic-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {currentQuestionIndex === questions.length - 1 ? 'Submit Assignment' : 'Next Question'}
                </button>
            </div>
        </div>
    );
};

export default WeekAssessmentModal;
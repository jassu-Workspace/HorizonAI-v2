import React, { useEffect, useRef, useState } from 'react';
import { getRapidAssessment } from '../services/geminiService';
import {
  calculateAssessmentScore,
  getWeeksForLevel,
  logAssessmentError,
  validateRapidQuestion,
  isSelfRatingQuestion,
  SELF_RATING_SENTINEL,
} from '../services/assessmentService';
import { RapidQuestion, RoadmapGenerationOptions } from '../types';
import { Loader } from './Loader';

interface ConfigureRoadmapProps {
  skillName: string;
  onGenerate: (weeks: string, level: string, options?: RoadmapGenerationOptions) => Promise<void>;
  onBack: () => void;
  interestDomain?: string;
  onTakeQuiz: () => void; // Legacy prop
  determinedSkillLevel?: 'Beginner' | 'Intermediate' | 'Expert'; // Legacy
}

const ASSESSMENT_LOAD_TIMEOUT_MS = 60000; // 60 seconds hard timeout
const ASSESSMENT_DURATION_SECONDS = 420; // 7 minutes

const ConfigureRoadmap: React.FC<ConfigureRoadmapProps & { interestDomain: string }> = ({
  skillName,
  onGenerate,
  onBack,
  interestDomain,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<RapidQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const [timer, setTimer] = useState(ASSESSMENT_DURATION_SECONDS);
  const [isRoadmapGenerating, setIsRoadmapGenerating] = useState(false);
  const [roadmapGenerationError, setRoadmapGenerationError] = useState('');

  const activeLoadRef = useRef(0);
  const mountedRef = useRef(true);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadAssessment();
  }, [skillName, interestDomain]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (!loading && !isCompleted && timer > 0 && questions.length > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && !isCompleted && questions.length > 0) {
      finishAssessment();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, isCompleted, timer, questions.length]);

  const loadAssessment = async () => {
    const loadId = activeLoadRef.current + 1;
    activeLoadRef.current = loadId;
    setLoading(true);
    setError('');
    setRoadmapGenerationError('');
    setIsRoadmapGenerating(false);

    // Set hard timeout for assessment load
    loadTimeoutRef.current = setTimeout(() => {
      if (loadId === activeLoadRef.current && mountedRef.current) {
        setError('Assessment generation took too long. Please try again.');
        setLoading(false);
      }
    }, ASSESSMENT_LOAD_TIMEOUT_MS);

    try {
      // Validate inputs before API call
      if (!skillName?.trim()) {
        throw new Error('Skill name is required');
      }
      if (!interestDomain?.trim()) {
        throw new Error('Interest domain is required');
      }

      // Load assessment from service
      const quiz = await getRapidAssessment(skillName, interestDomain);

      if (loadId !== activeLoadRef.current || !mountedRef.current) {
        return; // Latest request changed or component unmounted
      }

      // STRICT validation: check array is valid
      if (!Array.isArray(quiz) || quiz.length === 0) {
        throw new Error(
          `Invalid assessment response: expected array with questions, got ${typeof quiz}`,
        );
      }

      // Validate each question structure and content
      for (let i = 0; i < quiz.length; i++) {
        const q = quiz[i];
        const validation = validateRapidQuestion(q, i);

        if (!validation.isValid) {
          logAssessmentError('loadAssessment:question_validation', 'Question validation failed', {
            questionIndex: i,
            errors: validation.errors,
          });
          throw new Error(
            `Assessment question ${i + 1} is invalid: ${validation.errors[0]?.issue}`,
          );
        }
      }

      // All validations passed, set state
      setQuestions(quiz);
      setSelectedAnswers(new Array(quiz.length).fill(null));
      setCurrentQuestionIndex(0);
      setIsCompleted(false);
      setTimer(ASSESSMENT_DURATION_SECONDS);

      logAssessmentError('[Assessment] Loaded successfully', null, {
        skillName,
        questionCount: quiz.length,
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed to load assessment';

      logAssessmentError('loadAssessment', e, {
        skillName,
        interestDomain,
      });

      if (mountedRef.current && loadId === activeLoadRef.current) {
        setError(message || 'Failed to generate assessment. Please try again.');
      }
    } finally {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      if (mountedRef.current && loadId === activeLoadRef.current) {
        setLoading(false);
      }
    }
  };

  const handleAnswer = (option: string) => {
    if (isCompleted) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = option;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishAssessment();
    }
  };

  const finishAssessment = () => {
    if (isCompleted) return;
    setIsCompleted(true);

    try {
      // Use unified scoring function from assessment service
      const result = calculateAssessmentScore(questions, selectedAnswers);

      logAssessmentError('[Assessment] Score calculated', null, {
        skillName,
        score: result.score,
        maxScore: result.maxScore,
        percentage: result.percentage,
        level: result.level,
      });

      // Start roadmap generation
      void startRoadmapGeneration(String(getWeeksForLevel(result.level)), result.level, {
        background: true,
        scoreData: result,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not process assessment results. Please try again.';

      logAssessmentError('finishAssessment', error);

      if (mountedRef.current) {
        setRoadmapGenerationError(message);
        setIsRoadmapGenerating(false);
      }
    }
  };

  const startRoadmapGeneration = async (
    weeks: string,
    level: 'Beginner' | 'Intermediate' | 'Expert',
    options?: RoadmapGenerationOptions,
  ) => {
    if (isRoadmapGenerating) {
      return;
    }

    setRoadmapGenerationError('');
    setIsRoadmapGenerating(true);

    try {
      await onGenerate(weeks, level, {
        background: true,
        onError: (message: string) => {
          if (!mountedRef.current) {
            return;
          }
          setRoadmapGenerationError(message || 'Roadmap generation failed. Please retry.');
          setIsRoadmapGenerating(false);
        },
      });
    } catch (error: unknown) {
      if (!mountedRef.current) {
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Roadmap generation failed. Please retry.';
      setRoadmapGenerationError(message || 'Roadmap generation failed. Please retry.');
      setIsRoadmapGenerating(false);
    }
  };

  const handleSkip = () => {
    // Skip assessment and start with default Beginner level
    void onGenerate('12', 'Beginner');
  };

  const handleRetry = () => {
    setError('');
    void loadAssessment();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ============================================
  // RENDER: LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="glass-card p-10 max-w-2xl mx-auto mt-8 text-center">
        <Loader message={`Generating your personalized assessment for "${skillName}"...`} />
      </div>
    );
  }

  // ============================================
  // RENDER: ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="glass-card p-6 sm:p-10 max-w-2xl mx-auto mt-8 text-center">
        <div className="text-red-500 text-5xl mb-4">
          <ion-icon name="alert-circle"></ion-icon>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Unable to Generate Assessment</h3>
        <p className="text-slate-600 mb-6">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button onClick={handleRetry} className="dynamic-button w-full sm:w-auto">
            Retry Assessment
          </button>
          <button
            onClick={handleSkip}
            className="w-full sm:w-auto px-6 py-2 border border-slate-300 rounded-full text-slate-600 hover:bg-slate-50 transition"
          >
            Skip & Start Beginner Path
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: COMPLETED STATE (RESULTS)
  // ============================================
  if (isCompleted) {
    let scoreResult: ReturnType<typeof calculateAssessmentScore> | null = null;

    try {
      scoreResult = calculateAssessmentScore(questions, selectedAnswers);
    } catch (e) {
      return (
        <div className="glass-card p-6 sm:p-10 max-w-2xl mx-auto mt-8 text-center">
          <div className="text-red-500 text-5xl mb-4">
            <ion-icon name="alert-circle"></ion-icon>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Error Processing Results</h3>
          <p className="text-slate-600 mb-6">
            {e instanceof Error ? e.message : 'An error occurred while processing assessment.'}
          </p>
          <button onClick={onBack} className="dynamic-button">
            Back
          </button>
        </div>
      );
    }

    const answerReview = questions.map((question, index) => {
      const selectedAnswer = selectedAnswers[index];
      const selfRating = isSelfRatingQuestion(question);
      const isCorrect = !selfRating && Boolean(selectedAnswer) && selectedAnswer === question.correctAnswer;

      return {
        question,
        selectedAnswer,
        selfRating,
        isCorrect,
      };
    });

    const correctCount = answerReview.filter((item) => item.isCorrect).length;
    const wrongCount = answerReview.filter(
      (item) => !item.selfRating && item.selectedAnswer && !item.isCorrect,
    ).length;
    const skippedCount = answerReview.filter((item) => !item.selectedAnswer).length;

    return (
      <div className="glass-card p-6 md:p-8 max-w-3xl mx-auto mt-8 animate-fadeIn">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mb-4 text-green-600 mx-auto">
          <ion-icon name="checkmark-done"></ion-icon>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Assessment Complete!</h2>
        <p className="text-lg text-slate-600 mb-6 text-center">
          You scored <span className="font-bold text-blue-600">{scoreResult.score}/{scoreResult.maxScore}</span>{' '}
          ({scoreResult.percentage.toFixed(2)}%)
        </p>
        <div className="bg-slate-100 p-4 rounded-xl inline-block mb-6 mx-auto w-full sm:w-auto text-center">
          <p className="text-sm text-slate-500 uppercase tracking-wide font-bold">Recommended Level</p>
          <p className="text-2xl font-bold text-slate-800">{scoreResult.level}</p>
        </div>

        <div
          className={`rounded-xl border p-4 mb-4 ${
            roadmapGenerationError
              ? 'border-red-200 bg-red-50'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          {isRoadmapGenerating && !roadmapGenerationError ? (
            <p className="text-sm text-blue-700 font-semibold flex items-center justify-center gap-2">
              <ion-icon name="sync-outline" className="animate-spin"></ion-icon>
              Building your {getWeeksForLevel(scoreResult.level)}-week roadmap in background...
            </p>
          ) : roadmapGenerationError ? (
            <div className="text-center">
              <p className="text-sm text-red-700 font-semibold mb-3">{roadmapGenerationError}</p>
              <button
                onClick={() =>
                  void startRoadmapGeneration(
                    String(getWeeksForLevel(scoreResult.level)),
                    scoreResult.level,
                  )
                }
                className="dynamic-button !py-2 !px-6"
              >
                Retry Roadmap Generation
              </button>
            </div>
          ) : (
            <p className="text-sm text-blue-700 font-semibold text-center">
              Preparing your personalized roadmap...
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-4 text-sm font-semibold text-slate-700">
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700">
            {correctCount} Correct
          </span>
          <span className="px-3 py-1 rounded-full bg-red-100 text-red-700">
            {wrongCount} Wrong
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            {skippedCount} Skipped
          </span>
        </div>

        <div className="max-h-[340px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          {answerReview.map((item, index) => {
            const itemClass = item.selfRating
              ? 'border-amber-200 bg-amber-50'
              : item.isCorrect
                ? 'border-green-200 bg-green-50'
                : item.selectedAnswer
                  ? 'border-red-200 bg-red-50'
                  : 'border-slate-200 bg-slate-50';

            return (
              <div
                key={`answer-review-${index}`}
                className={`rounded-lg border p-3 ${itemClass}`}
              >
                <p className="text-sm font-semibold text-slate-800 mb-2">
                  Q{index + 1}. {item.question.question}
                </p>
                <p className="text-sm text-slate-700">
                  Your answer: <span className="font-medium">{item.selectedAnswer || 'Not answered'}</span>
                </p>
                {item.selfRating ? (
                  <p className="text-xs text-amber-700 mt-1">
                    Self-rating question (no fixed correct answer).
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 mt-1">
                    Correct answer: <span className="font-semibold">{item.question.correctAnswer}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <button
            onClick={onBack}
            className="text-sm font-semibold text-slate-600 hover:text-slate-800 text-left"
          >
            Back
          </button>
          <p className="text-xs text-slate-500">
            You can review your answers while your roadmap is being generated.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: IN-PROGRESS QUIZ
  // ============================================
  if (questions.length === 0) {
    return (
      <div className="glass-card p-10 max-w-2xl mx-auto mt-8 text-center">
        <p className="text-slate-600">Loading assessment...</p>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="glass-card p-6 md:p-10 max-w-3xl mx-auto mt-8 relative animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Rapid Assessment</h2>
        <div
          className={`font-mono font-bold text-lg px-3 py-1 rounded-lg ${
            timer < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {formatTime(timer)}
        </div>
      </div>

      <progress className="quiz-progress-bar mb-8" value={progress} max={100} />

      <div className="mb-8 min-h-[200px]">
        <p className="text-sm text-slate-500 font-bold mb-2">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
        <h3 className="text-xl font-bold text-slate-800 mb-6">{currentQ.question}</h3>
        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => (
            <button
              key={`option-${idx}`}
              onClick={() => handleAnswer(opt)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedAnswers[currentQuestionIndex] === opt
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow-md'
                  : 'border-slate-200 bg-white hover:border-blue-300 text-slate-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 border-t border-slate-100">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-800 text-sm font-semibold text-left"
        >
          Cancel
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedAnswers[currentQuestionIndex]}
          className="dynamic-button !py-2 !px-8 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default ConfigureRoadmap;
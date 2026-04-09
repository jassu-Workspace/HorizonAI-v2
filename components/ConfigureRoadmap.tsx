import React, { useState, useEffect } from 'react';
import { getRapidAssessment } from '../services/geminiService';
import { AssessmentFlowResult, RapidQuestion } from '../types';
import { Loader } from './Loader';

interface ConfigureRoadmapProps {
    skillName: string;
    onAssessmentComplete: (assessmentResult: AssessmentFlowResult) => void;
    onBack: () => void;
    interestDomain?: string; 
    onTakeQuiz: () => void; // Legacy prop
    determinedSkillLevel?: 'Beginner' | 'Intermediate' | 'Expert'; // Legacy
}

const ConfigureRoadmap: React.FC<ConfigureRoadmapProps & { interestDomain: string }> = ({ skillName, onAssessmentComplete, onBack, interestDomain }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [questions, setQuestions] = useState<RapidQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);

    useEffect(() => {
        loadAssessment();
    }, [skillName]);

    const loadAssessment = async () => {
        setLoading(true);
        setError('');

        try {
            const quiz = await getRapidAssessment(skillName, interestDomain || 'General');
            setQuestions(quiz);
            setSelectedAnswers(new Array(quiz.length).fill(null));
            setCurrentQuestionIndex(0);
        } catch (e: any) {
            setError('Could not generate the assessment test. Please try again or skip.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option: string) => {
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestionIndex] = option;
        setSelectedAnswers(newAnswers);
    };

    const calculateScore = () => {
        return questions.reduce((acc, question, idx) => {
            return selectedAnswers[idx] === question.correctAnswer ? acc + 1 : acc;
        }, 0);
    };

    const determineLevel = (score: number): string => {
        const percentage = (score / questions.length) * 100;

        if (percentage > 70) return 'Expert';
        if (percentage >= 40) return 'Intermediate';
        return 'Beginner';
    };

    const finishAssessment = () => {
        const score = calculateScore();
        const level = determineLevel(score);

        let weeks = '12';
        if (level === 'Intermediate') weeks = '8';
        if (level === 'Expert') weeks = '4';

        onAssessmentComplete({
            skillName,
            selectedCareer: skillName,
            interestDomain: interestDomain || 'General',
            questions,
            selectedAnswers,
            score,
            totalQuestions: questions.length,
            recommendedLevel: level as 'Beginner' | 'Intermediate' | 'Expert',
            recommendedWeeks: weeks,
            completedAt: new Date().toISOString(),
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            return;
        }

        finishAssessment();
    };

    const handleSkip = () => {
        onAssessmentComplete({
            skillName,
            selectedCareer: skillName,
            interestDomain: interestDomain || 'General',
            questions: [],
            selectedAnswers: [],
            score: 0,
            totalQuestions: 0,
            recommendedLevel: 'Beginner',
            recommendedWeeks: '12',
            completedAt: new Date().toISOString(),
        });
    };

    if (loading) {
        return (
            <div className="glass-card mx-auto mt-8 max-w-2xl p-10 text-center">
                <Loader message={`Generating personalized assessment for ${skillName}...`} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card mx-auto mt-8 max-w-2xl p-6 text-center sm:p-10">
                <div className="mb-4 text-5xl text-red-500">
                    <span aria-hidden="true">⚠</span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-800">Connection Issue</h3>
                <p className="mb-6 text-slate-600">{error}</p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                    <button onClick={loadAssessment} className="dynamic-button w-full sm:w-auto">Retry</button>
                    <button onClick={handleSkip} className="w-full rounded-full border border-slate-300 px-6 py-2 text-slate-600 hover:bg-slate-50 sm:w-auto">Skip & Start Beginner Path</button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    if (!currentQuestion) {
        return (
            <div className="glass-card mx-auto mt-8 max-w-2xl p-8 text-center text-slate-600 dark:text-slate-300">
                No assessment questions were generated. Please try again.
            </div>
        );
    }

    return (
        <div className="glass-card relative mx-auto mt-8 max-w-3xl animate-fadeIn p-6 md:p-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Assessment</h2>
                    <p className="mt-1 text-sm text-slate-500">Untimed. Answer at your own pace.</p>
                </div>
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-500 backdrop-blur-md">
                    No time limit
                </div>
            </div>

            <div className="mb-8 flex gap-2" aria-label="Assessment progress">
                {questions.map((_, index) => (
                    <div
                        key={index}
                        className={`h-2 flex-1 rounded-full transition-colors ${index <= currentQuestionIndex ? 'bg-blue-600' : 'bg-slate-200'}`}
                    />
                ))}
            </div>

            <div className="mb-8 min-h-[200px]">
                <p className="mb-2 text-sm font-bold text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <h3 className="mb-6 text-xl font-bold text-slate-800">{currentQuestion.question}</h3>
                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleAnswer(option)}
                            className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                                selectedAnswers[currentQuestionIndex] === option
                                    ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700 shadow-md'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                            }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                    onClick={onBack}
                    className="text-left text-sm font-semibold text-slate-500 hover:text-slate-800"
                >
                    Cancel
                </button>
                <button
                    onClick={handleNext}
                    disabled={!selectedAnswers[currentQuestionIndex]}
                    className="dynamic-button w-full !py-2 !px-8 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    {currentQuestionIndex === questions.length - 1 ? 'Finish & Review' : 'Next'}
                </button>
            </div>
        </div>
    );
};

export default ConfigureRoadmap;
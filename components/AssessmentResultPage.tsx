import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { generateRoadmapFromAssessment } from '../services/geminiService';

const AssessmentResultPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        userProfile,
        selectedCareer,
        assessmentResult,
        roadmapResult,
        isRoadmapLoading,
        roadmapError,
        setRoadmapResult,
        setIsRoadmapLoading,
        setRoadmapError,
    } = useAppContext();
    const roadmapStartedRef = useRef(false);

    const triggerRoadmapGeneration = async () => {
        if (!assessmentResult || roadmapStartedRef.current || isRoadmapLoading || roadmapResult) {
            return;
        }

        roadmapStartedRef.current = true;
        setIsRoadmapLoading(true);
        setRoadmapError('');

        try {
            const roadmap = await generateRoadmapFromAssessment({
                profile: userProfile,
                selectedCareer,
                assessmentResult,
            });

            setRoadmapResult(roadmap);
        } catch (error: any) {
            roadmapStartedRef.current = false;
            setRoadmapError(error?.message || 'Roadmap generation failed.');
        } finally {
            setIsRoadmapLoading(false);
        }
    };

    useEffect(() => {
        void triggerRoadmapGeneration();
    }, [assessmentResult?.completedAt]);

    if (!assessmentResult) {
        return null;
    }

    const reviewItems = assessmentResult.questions.map((question, index) => {
        const selectedAnswer = assessmentResult.selectedAnswers[index] || 'Not answered';
        const isCorrect = assessmentResult.selectedAnswers[index] === question.correctAnswer;

        return {
            index,
            question: question.question,
            selectedAnswer,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation || 'The correct answer follows directly from the core concept tested in this question.',
            isCorrect,
        };
    });

    const handleShowRoadmap = () => {
        if (roadmapError) {
            roadmapStartedRef.current = false;
            void triggerRoadmapGeneration();
            return;
        }

        if (isRoadmapLoading) {
            navigate('/processing');
            return;
        }

        if (roadmapResult) {
            navigate('/result');
        }
    };

    return (
        <div className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[1.6fr_0.9fr] px-4 sm:px-0">
            <section className="glass-card rounded-[2rem] border border-white/40 p-5 shadow-xl dark:border-slate-700/60 md:p-8">
                <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-5 dark:border-slate-700/70 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">Assessment result</p>
                        <h1 className="roadmap-title-font mt-2 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Review every answer before opening the roadmap.</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                            Your roadmap is generated in the background while you inspect what was correct, what was not, and why.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Score</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{assessmentResult.score}/{assessmentResult.totalQuestions}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Level</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{assessmentResult.recommendedLevel}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Plan</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{assessmentResult.recommendedWeeks} Weeks</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    {reviewItems.map((item) => (
                        <div key={item.index} className={`rounded-3xl border p-5 shadow-sm ${item.isCorrect ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/20'}`}>
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Question {item.index + 1}</p>
                                    <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{item.question}</h2>
                                </div>
                                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${item.isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                                    {item.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your answer</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{item.selectedAnswer}</p>
                                </div>
                                <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Correct answer</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{item.correctAnswer}</p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl bg-slate-900/5 p-4 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
                                <p className="font-semibold text-slate-900 dark:text-white">Why this is correct</p>
                                <p className="mt-1 leading-relaxed">{item.explanation}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <aside className="glass-card sticky top-24 h-fit rounded-[2rem] border border-white/40 p-5 shadow-xl dark:border-slate-700/60 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">Roadmap status</p>
                        <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                            {roadmapResult ? 'Roadmap Ready' : 'Generating your roadmap...'}
                        </h2>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${roadmapResult ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                        <span className={isRoadmapLoading ? 'animate-spin' : ''} aria-hidden="true">◔</span>
                    </div>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
                    {roadmapError ? (
                        <p className="text-rose-600 dark:text-rose-300">{roadmapError}</p>
                    ) : isRoadmapLoading ? (
                        <p>Generating your personalized roadmap in the background. You can keep reviewing the assessment.</p>
                    ) : roadmapResult ? (
                        <p>Your roadmap is ready. Open it whenever you want.</p>
                    ) : (
                        <p>We are preparing your roadmap now. This view will update automatically when the plan is ready.</p>
                    )}
                </div>

                <div className="mt-4 space-y-3">
                    <button
                        type="button"
                        onClick={handleShowRoadmap}
                        className={`dynamic-button w-full ${roadmapResult ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent' : ''}`}
                    >
                        {roadmapError ? 'Retry Roadmap' : roadmapResult ? 'Show Roadmap' : 'Show Roadmap'}
                    </button>

                    {isRoadmapLoading && (
                        <button type="button" onClick={() => navigate('/processing')} className="w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                            Open Processing View
                        </button>
                    )}

                    <button type="button" onClick={() => navigate('/create')} className="w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        Start Over
                    </button>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    The roadmap generation runs once per assessment submission. If the network fails, retry safely without losing your review state.
                </div>
            </aside>
        </div>
    );
};

export default AssessmentResultPage;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

const ProcessingPage: React.FC = () => {
    const navigate = useNavigate();
    const { roadmapResult, roadmapError, isRoadmapLoading } = useAppContext();

    return (
        <div className="mx-auto mt-10 max-w-3xl px-4 sm:px-0">
            <div className="glass-card rounded-[2rem] border border-white/40 p-8 text-center shadow-xl dark:border-slate-700/60 md:p-12">
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 ${roadmapResult ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300'}`}>
                    <span className={isRoadmapLoading ? 'animate-spin' : ''} aria-hidden="true">◔</span>
                </div>

                <h1 className="roadmap-title-font mt-6 text-3xl font-bold text-slate-900 dark:text-white">
                    {roadmapResult ? 'Roadmap Ready' : 'Generating your roadmap...'}
                </h1>

                <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                    {roadmapError
                        ? roadmapError
                        : roadmapResult
                            ? 'You can open the completed roadmap now.'
                            : 'The roadmap is still being prepared in the background. Your assessment review remains available.'}
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    {roadmapResult ? (
                        <button type="button" onClick={() => navigate('/result')} className="dynamic-button w-full sm:w-auto">
                            Show Roadmap
                        </button>
                    ) : (
                        <button type="button" onClick={() => navigate('/assessment-result')} className="dynamic-button w-full sm:w-auto">
                            Back to Review
                        </button>
                    )}

                    <button type="button" onClick={() => navigate('/create')} className="w-full rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto">
                        Start Over
                    </button>
                </div>

                {roadmapError && (
                    <button type="button" onClick={() => navigate('/assessment-result')} className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        Retry generation from review
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProcessingPage;
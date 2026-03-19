import React, { useState } from 'react';
import { MockInterview, QuizQuestion } from '../types';

interface MockInterviewModalProps {
    interview: MockInterview;
    onRefresh?: () => void;
}

const MockInterviewModal: React.FC<MockInterviewModalProps> = ({ interview, onRefresh }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefreshClick = async () => {
        if (onRefresh) {
            setIsRefreshing(true);
            await onRefresh();
            setIsRefreshing(false); // In case parent doesn't unmount/remount
        }
    };

    return (
        <div className="text-slate-700 space-y-6">
            <div>
                <h3 className="font-bold text-lg text-amber-600 mb-3">Theory Questions</h3>
                <div className="space-y-3">
                    {interview.theory_questions.map((q, i) => (
                        <p key={i}><strong>{i + 1}.</strong> {q}</p>
                    ))}
                </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
                <h3 className="font-bold text-lg text-amber-600 mb-3">Multiple Choice Questions</h3>
                <div className="space-y-4">
                    {interview.mcq_questions.map((mcq, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="font-semibold mb-2">{i + 1}. {mcq.question}</p>
                            <ul className="text-sm list-disc list-inside ml-4">
                                {mcq.options.map(opt => <li key={opt}>{opt}</li>)}
                            </ul>
                            <p className="text-xs text-green-600 mt-2 font-bold">Correct Answer: {mcq.correctAnswer}</p>
                        </div>
                    ))}
                </div>
            </div>

            {onRefresh && (
                <div className="border-t border-slate-200 pt-6 text-center">
                    <button 
                        onClick={handleRefreshClick} 
                        disabled={isRefreshing}
                        className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                    >
                        <ion-icon name="refresh-outline" className={isRefreshing ? "animate-spin" : ""}></ion-icon>
                        {isRefreshing ? 'Getting new questions...' : 'Refresh Questions'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MockInterviewModal;
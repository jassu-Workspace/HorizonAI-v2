import React, { useState, useEffect } from 'react';
import { getRapidAssessment } from '../services/geminiService';
import { RapidQuestion } from '../types';
import { Loader } from './Loader';

interface ConfigureRoadmapProps {
    skillName: string;
    onGenerate: (weeks: string, level: string) => void;
    onBack: () => void;
    interestDomain?: string; 
    onTakeQuiz: () => void; // Legacy prop
    determinedSkillLevel?: 'Beginner' | 'Intermediate' | 'Expert'; // Legacy
}

const ConfigureRoadmap: React.FC<ConfigureRoadmapProps & { interestDomain: string }> = ({ skillName, onGenerate, onBack, interestDomain }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [questions, setQuestions] = useState<RapidQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);
    const [isCompleted, setIsCompleted] = useState(false);
    
    // Updated: 7 minutes = 420 seconds
    const [timer, setTimer] = useState(420); 

    useEffect(() => {
        loadAssessment();
    }, [skillName]);

    useEffect(() => {
        let interval: any;
        if (!loading && !isCompleted && timer > 0 && questions.length > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else if (timer === 0 && !isCompleted && questions.length > 0) {
            finishAssessment();
        }
        return () => clearInterval(interval);
    }, [loading, isCompleted, timer, questions.length]);

    const loadAssessment = async () => {
        setLoading(true);
        setError('');
        try {
            const quiz = await getRapidAssessment(skillName, interestDomain || 'General');
            setQuestions(quiz);
            setSelectedAnswers(new Array(quiz.length).fill(null));
            setLoading(false);
        } catch (e: any) {
            console.error("Failed to load assessment", e);
            setError("Could not generate the assessment test. Please try again or skip.");
            setLoading(false);
        }
    };

    const handleAnswer = (option: string) => {
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestionIndex] = option;
        setSelectedAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            finishAssessment();
        }
    };

    const finishAssessment = () => {
        setIsCompleted(true);
        const score = calculateScore();
        const level = determineLevel(score);
        
        // Updated Logic:
        // Beginner: 12 weeks
        // Intermediate: 8 weeks
        // Expert: 4 weeks
        let weeks = "12";
        if (level === "Intermediate") weeks = "8";
        if (level === "Expert") weeks = "4";

        setTimeout(() => {
            onGenerate(weeks, level);
        }, 2000); // 2s delay to show result
    };

    const calculateScore = () => {
        return questions.reduce((acc, q, idx) => {
            return selectedAnswers[idx] === q.correctAnswer ? acc + 1 : acc;
        }, 0);
    };

    const determineLevel = (score: number): string => {
        const percentage = (score / questions.length) * 100;
        
        // Updated Thresholds:
        // Expert: > 70%
        // Intermediate: 40% - 70%
        // Beginner: < 40%
        if (percentage > 70) return "Expert";
        if (percentage >= 40) return "Intermediate";
        return "Beginner";
    };

    const handleSkip = () => {
        // Fallback default
        onGenerate("12", "Beginner");
    };

    if (loading) {
        return (
            <div className="glass-card p-10 max-w-2xl mx-auto mt-8 text-center">
                <Loader message={`Generating personalized assessment for ${skillName}...`} />
            </div>
        );
    }

    if (error) {
        return (
             <div className="glass-card p-6 sm:p-10 max-w-2xl mx-auto mt-8 text-center">
                <div className="text-red-500 text-5xl mb-4"><ion-icon name="alert-circle"></ion-icon></div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Connection Issue</h3>
                <p className="text-slate-600 mb-6">{error}</p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <button onClick={loadAssessment} className="dynamic-button w-full sm:w-auto">Retry</button>
                    <button onClick={handleSkip} className="w-full sm:w-auto px-6 py-2 border border-slate-300 rounded-full text-slate-600 hover:bg-slate-50">Skip & Start Beginner Path</button>
                </div>
            </div>
        );
    }

    if (isCompleted) {
        const score = calculateScore();
        const level = determineLevel(score);
        return (
            <div className="glass-card p-10 max-w-2xl mx-auto mt-8 text-center animate-fadeIn">
                 <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mb-4 text-green-600 mx-auto">
                    <ion-icon name="checkmark-done"></ion-icon>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Assessment Complete!</h2>
                <p className="text-lg text-slate-600 mb-6">You scored <span className="font-bold text-blue-600">{score}/{questions.length}</span></p>
                <div className="bg-slate-100 p-4 rounded-xl inline-block mb-6">
                    <p className="text-sm text-slate-500 uppercase tracking-wide font-bold">Recommended Level</p>
                    <p className="text-2xl font-bold text-slate-800">{level}</p>
                </div>
                <p className="text-sm text-slate-500 animate-pulse">Generating your custom roadmap...</p>
            </div>
        );
    }

    const currentQ = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="glass-card p-6 md:p-10 max-w-3xl mx-auto mt-8 relative animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-slate-900">Rapid Assessment</h2>
                <div className={`font-mono font-bold text-lg px-3 py-1 rounded-lg ${timer < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                    {formatTime(timer)}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full mb-8">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="mb-8 min-h-[200px]">
                <p className="text-sm text-slate-500 font-bold mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <h3 className="text-xl font-bold text-slate-800 mb-6">{currentQ.question}</h3>
                <div className="space-y-3">
                    {currentQ.options.map((opt, idx) => (
                        <button
                            key={idx}
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
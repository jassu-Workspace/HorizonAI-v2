import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { UserProfile } from '../types';
import { generateSkillSuggestions, SkillSuggestion } from '../services/assessmentApiService';

interface InputFormProps {
    existingProfile: UserProfile;
    onSubmit: (profile: UserProfile) => void;
    title: string;
    isLoading?: boolean;
    errorMessage?: string;
}

const skillExamples = ["baking sourdough", "graphic design", "playing guitar", "data analysis with Python", "calligraphy"];
const interestExamples = ["Finance & Fintech", "Healthcare AI", "Sustainable Energy", "Game Development", "Ancient History"];

const InputForm: React.FC<InputFormProps> = ({ existingProfile, onSubmit, title, isLoading = false, errorMessage }) => {
    const [skills, setSkills] = useState(existingProfile.skills || '');
    const [interests, setInterests] = useState(existingProfile.interests || '');
    const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([]);
    const [suggestionError, setSuggestionError] = useState('');
    const [academicLevel, setAcademicLevel] = useState(existingProfile.academicLevel || 'Graduation');
    const [prevAcademicHistory, setPrevAcademicHistory] = useState('');
    const [presentSkills, setPresentSkills] = useState<string[]>([]);
    
    const [skillExample, setSkillExample] = useState(skillExamples[0]);
    const [interestExample, setInterestExample] = useState(interestExamples[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSkillExample(prev => skillExamples[(skillExamples.indexOf(prev) + 1) % skillExamples.length]);
            setInterestExample(prev => interestExamples[(interestExamples.indexOf(prev) + 1) % interestExamples.length]);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!skills.trim() || !interests.trim()) {
            setSuggestions([]);
            setSuggestionError('');
            return;
        }

        const debounceTimer = window.setTimeout(async () => {
            try {
                setSuggestionError('');
                const results = await generateSkillSuggestions(skills, interests);
                setSuggestions(results.slice(0, 4));
            } catch (error) {
                console.warn('[InputForm] Skill suggestions fetch failed:', error);
                setSuggestionError('Unable to fetch skill suggestions right now.');
                setSuggestions([]);
            }
        }, 700);

        return () => window.clearTimeout(debounceTimer);
    }, [skills, interests]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return; // prevent double-submit

        const profile: UserProfile = {
            ...existingProfile,
            skills,
            interests,
            academicLevel,
            prevAcademicHistory,
            presentSkills: presentSkills.join(', '),
        };
        onSubmit(profile);
    };
    
    return (
         <div className="glass-card p-6 md:p-10 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8">What do you want to master next?</p>

            {/* Error message from parent (e.g., after failed API call) */}
            {errorMessage && (
                <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" role="alert" aria-live="polite">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-6">
                    <div>
                        <label htmlFor="skills-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Target Skill to Learn <span className="text-slate-500 dark:text-slate-400">(for this roadmap)</span></label>
                        <input
                            id="skills-input"
                            type="text"
                            required
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                            placeholder="e.g., Python, public speaking"
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-slate-900 dark:text-white placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 h-4">e.g., <span className="transition-opacity duration-500 ease-in-out">{skillExample}</span></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-baseline">
                             <label htmlFor="interests-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">My Interest Domain</label>
                        </div>
                        <input
                            id="interests-input"
                            type="text"
                            required
                            value={interests}
                            onChange={(e) => setInterests(e.target.value)}
                            placeholder="e.g., Fintech, Healthcare, Gaming"
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-slate-900 dark:text-white placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                         <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 h-4">e.g., <span className="transition-opacity duration-500 ease-in-out">{interestExample}</span></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Academic Level</label>
                        <select
                            value={academicLevel}
                            onChange={e => setAcademicLevel(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            <option value="Graduation">Graduation</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Diploma">Diploma</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Previous Academic History</label>
                        <input
                            type="text"
                            value={prevAcademicHistory}
                            onChange={e => setPrevAcademicHistory(e.target.value)}
                            placeholder={academicLevel === 'Graduation' ? 'e.g., Intermediate or Diploma' : 'e.g., 10th, 12th, etc.'}
                            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Present Skills (search & select)</label>
                        <Select
                            isMulti
                            isClearable
                            placeholder="Type to search and select skills..."
                            value={presentSkills.map(s => ({ value: s, label: s }))}
                            onChange={opts => setPresentSkills((opts || []).map((o: any) => o.value))}
                            options={[
                                { value: 'HTML', label: 'HTML' },
                                { value: 'CSS', label: 'CSS' },
                                { value: 'JavaScript', label: 'JavaScript' },
                                { value: 'Python', label: 'Python' },
                                { value: 'Prompt Engineering', label: 'Prompt Engineering' },
                                { value: 'Vibe Coding', label: 'Vibe Coding' },
                                { value: 'React', label: 'React' },
                                { value: 'Node.js', label: 'Node.js' },
                                { value: 'SQL', label: 'SQL' },
                                { value: 'Machine Learning', label: 'Machine Learning' },
                                { value: 'Data Analysis', label: 'Data Analysis' },
                                { value: 'Public Speaking', label: 'Public Speaking' },
                                { value: 'UI/UX Design', label: 'UI/UX Design' },
                                { value: 'Cloud Computing', label: 'Cloud Computing' },
                                { value: 'Other', label: 'Other' },
                            ]}
                            isDisabled={isLoading}
                        />
                    </div>
                </div>

                {suggestionError && (
                    <div className="mt-4 text-sm text-amber-700 dark:text-amber-300">
                        {suggestionError}
                    </div>
                )}

                {suggestions.length > 0 && (
                    <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Suggested skills to explore</h3>
                        <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                            {suggestions.map((suggestion) => (
                                <li key={suggestion.name} className="rounded-lg p-3 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <strong className="block text-slate-900 dark:text-white">{suggestion.name}</strong>
                                    <span className="block text-slate-500 dark:text-slate-400">{suggestion.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="dynamic-button w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-busy={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Analyzing your profile...
                            </span>
                        ) : (
                            'Start Assessment & Generate Path'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InputForm;
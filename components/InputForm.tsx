import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface InputFormProps {
    existingProfile: UserProfile;
    onSubmit: (profile: UserProfile) => void;
    title: string;
}

const skillExamples = ["baking sourdough", "graphic design", "playing guitar", "data analysis with Python", "calligraphy"];
const interestExamples = ["Finance & Fintech", "Healthcare AI", "Sustainable Energy", "Game Development", "Ancient History"];

const InputForm: React.FC<InputFormProps> = ({ existingProfile, onSubmit, title }) => {
    const [skills, setSkills] = useState('');
    const [interests, setInterests] = useState('');
    
    const [skillExample, setSkillExample] = useState(skillExamples[0]);
    const [interestExample, setInterestExample] = useState(interestExamples[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSkillExample(prev => skillExamples[(skillExamples.indexOf(prev) + 1) % skillExamples.length]);
            setInterestExample(prev => interestExamples[(interestExamples.indexOf(prev) + 1) % interestExamples.length]);
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Pass only the new roadmap-specific inputs. 
        // The main profile context is already stored in the parent 'existingProfile'
        const profile: UserProfile = { 
            ...existingProfile,
            skills, 
            interests
        };
        
        onSubmit(profile);
    };
    
    return (
         <div className="glass-card p-6 md:p-10 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8">What do you want to master next?</p>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-6">
                    <div>
                        <label htmlFor="skills-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Target Skill to Learn <span className="text-slate-500 dark:text-slate-400">(for this roadmap)</span></label>
                        <input id="skills-input" type="text" required value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g., Python, public speaking" className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-slate-900 dark:text-white placeholder-slate-400"/>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 h-4">e.g., <span className="transition-opacity duration-500 ease-in-out">{skillExample}</span></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-baseline">
                             <label htmlFor="interests-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">My Interest Domain</label>
                        </div>
                        <input id="interests-input" type="text" required value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g., Fintech, Healthcare, Gaming" className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-slate-900 dark:text-white placeholder-slate-400"/>
                         <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 h-4">e.g., <span className="transition-opacity duration-500 ease-in-out">{interestExample}</span></div>
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <button type="submit" className="dynamic-button">
                        Start Assessment & Generate Path
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InputForm;
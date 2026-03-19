import React, { useState, useEffect } from 'react';
import { UserProfile, LearningStyle, AcademicLevel, Stream, FocusArea } from '../types';
import { updateProfileWithLimit } from '../services/supabaseService';

interface ProfileEditModalProps {
    userProfile: UserProfile;
    onClose: () => void;
    onSave: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ userProfile, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<UserProfile>>(userProfile);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [streamOptions, setStreamOptions] = useState<Stream[]>([]);

    useEffect(() => {
        const level = formData.academicLevel;
        if (level === 'Class 12' || level === 'Class 10') {
            setStreamOptions(['Science', 'Commerce', 'Biology', 'Arts', 'General']);
        } else if (level === 'Diploma / Polytechnic') {
             setStreamOptions(['Diploma Engineering', 'Commerce', 'Arts']);
        } else { // Graduation
            setStreamOptions(['Engineering', 'Science', 'Commerce', 'Arts', 'Medical']);
        }
    }, [formData.academicLevel]);

    const handleChange = (field: keyof UserProfile, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleStreamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({...prev, stream: e.target.value as Stream}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        const result = await updateProfileWithLimit(formData as UserProfile);
        setIsLoading(false);
        if (result.success) {
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => {
                onSave();
            }, 1000);
        } else {
            setMessage({ type: 'error', text: result.message || 'An error occurred.' });
        }
    };

    const PillGroup: React.FC<{label: string, options: string[], selected: string, onSelect: (value: any) => void }> = ({label, options, selected, onSelect}) => (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                     <button type="button" key={opt} onClick={() => onSelect(opt)} className={`pill-button ${selected === opt ? 'selected' : ''}`}>{opt}</button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center" onClick={onClose}>
            <div className="modal-content glass-card p-6 md:p-8 w-[90%] max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Edit Profile</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
                        <ion-icon name="close-circle-outline" className="text-3xl"></ion-icon>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input 
                            type="text"
                            required
                            value={formData.fullName || ''}
                            onChange={(e) => handleChange('fullName', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    
                    <PillGroup 
                        label="Academic Level"
                        options={['Class 10', 'Class 12', 'Diploma / Polytechnic', 'Graduation']} 
                        selected={formData.academicLevel || 'Graduation'} 
                        onSelect={(val) => handleChange('academicLevel', val)}
                    />
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Stream</label>
                         <select value={formData.stream} onChange={handleStreamChange} className="w-full p-2 border rounded bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none border-slate-300">
                            {streamOptions.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>

                    <PillGroup 
                        label="Primary Focus"
                        options={['General', 'NCVET/NSQF Aligned', 'Govt. Job Exams', 'Higher Education Abroad', 'Startup / Entrepreneurship', 'Freelancing & Gigs']} 
                        selected={formData.focusArea || 'General'} 
                        onSelect={(val) => handleChange('focusArea', val)}
                    />

                    <PillGroup 
                        label="Learning Style"
                        options={['Balanced', 'Visual', 'Practical', 'Theoretical']} 
                        selected={formData.learningStyle || 'Balanced'} 
                        onSelect={(val) => handleChange('learningStyle', val)}
                    />

                    {message && (
                        <div className={`p-3 rounded-lg text-sm font-semibold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}
                    
                    <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
                         <button type="button" onClick={onClose} className="dynamic-button bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 shadow-sm hover:shadow-md">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="dynamic-button">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileEditModal;

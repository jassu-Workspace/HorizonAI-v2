import React, { useEffect, useState, useRef } from 'react';
import { RoadmapData, UserProfile, Stream, AcademicLevel, FocusArea, LearningStyle, ResumeAnalysis } from '../types';
import { getPastRoadmaps, getCurrentProfile, setRoadmapAsActive, uploadResume, deleteResume, getResumeText } from '../services/supabaseService';
import { Loader } from './Loader';
import Modal from './Modal';

interface DashboardProps {
    onSelectRoadmap: (data: RoadmapData) => void;
    onNewRoadmap: () => void;
    onImportRoadmap: () => void;
    onAnalyzeResume: (resumeText: string) => void;
    onEditProfile: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectRoadmap, onNewRoadmap, onImportRoadmap, onAnalyzeResume, onEditProfile }) => {
    const [roadmaps, setRoadmaps] = useState<RoadmapData[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingActivationId, setPendingActivationId] = useState<string | null>(null);
    const resumeInputRef = useRef<HTMLInputElement>(null);
    const isMountedRef = useRef(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);


    useEffect(() => {
        isMountedRef.current = true;
        fetchData();

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [maps, userProfile] = await Promise.all([
                getPastRoadmaps(5), 
                getCurrentProfile()
            ]);
            if (!isMountedRef.current) {
                return;
            }
            setRoadmaps(maps);
            setProfile(userProfile);
        } catch (e) {
            console.error(e);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    const activeRoadmap = roadmaps.find(map => map.status === 'active');
    const savedRoadmaps = roadmaps.filter(map => map.status !== 'active').slice(0, 3);

    const initiateActivation = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPendingActivationId(id);
        setShowConfirmModal(true);
    };

    const confirmActivation = async () => {
        if (pendingActivationId) {
            await setRoadmapAsActive(pendingActivationId);
            setShowConfirmModal(false);
            setPendingActivationId(null);
            fetchData();
        }
    };

    const handleResumeUpdate = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            if (profile?.resumePath) {
                await deleteResume(profile.resumePath);
            }
            await uploadResume(file);
            await fetchData();
            alert("Resume updated successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to update resume.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleAnalyzeResumeClick = async () => {
        if (!profile?.resumePath) {
            alert("Please upload a resume first.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const resumeText = await getResumeText(profile.resumePath);
            onAnalyzeResume(resumeText);
        } catch (error: any) {
            console.error("Failed to analyze resume:", error);
            alert(`Could not analyze the resume: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };


    if (loading) return <Loader message="Loading your learning dashboard..." />;

    return (
        <div className="container mx-auto max-w-6xl px-4 relative">
            <div className="flex flex-col md:flex-row gap-8">
                {/* LEFT COLUMN: Profile, Resume & Analyzer */}
                <div className="w-full md:w-1/3 space-y-6">
                    
                    {/* My Profile Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ion-icon name="person-circle-outline" className="text-2xl"></ion-icon>
                                My Profile
                            </h3>
                            <button onClick={onEditProfile} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1 rounded-full transition-colors">
                                Edit Details
                            </button>
                        </div>

                        {/* Golden XP Bar */}
                        <div className="bg-[#FFF9C4] dark:bg-[#332a00] border border-[#FBC02D] dark:border-[#826417] rounded-2xl p-4 flex items-center justify-between mb-8 shadow-sm">
                            <div>
                                <p className="text-[10px] font-bold text-[#8D6E03] dark:text-[#ffd54f] uppercase tracking-wider mb-1">TOTAL XP</p>
                                <p className="text-3xl font-extrabold text-[#F57F17] dark:text-[#ffca28]">{profile?.totalPoints || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-[#FDD835] dark:bg-[#f9a825] rounded-full flex items-center justify-center shadow-inner text-white text-2xl border-2 border-[#FFEE58] dark:border-[#fbc02d]">
                                <ion-icon name="trophy"></ion-icon>
                            </div>
                        </div>

                        {/* Profile Details Grid */}
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">NAME</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">{profile?.fullName || 'Scholar'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ACADEMIC LEVEL</p>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">{profile?.academicLevel}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">STREAM</p>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">{profile?.stream}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">FOCUS AREA</p>
                                <span className="inline-block bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                                    {profile?.focusArea}
                                </span>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">LEARNING STYLE</p>
                                <p className="font-semibold text-slate-700 dark:text-slate-300">{profile?.learningStyle}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">TOP SUBJECTS</p>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={profile?.interestedSubjects}>{profile?.interestedSubjects || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">RECENT SCORE</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">{profile?.previousPerformance || '-'}</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Academic History Section */}
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm flex items-center gap-2">
                                <ion-icon name="school-outline" className="text-slate-400"></ion-icon> 
                                Academic History
                            </h4>
                            <div className="space-y-3">
                                {profile?.class12Performance && (
                                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Class 12 ({profile.class12Stream || 'N/A'})</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile.class12Performance}</span>
                                    </div>
                                )}
                                {profile?.diplomaPerformance && (
                                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Diploma</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile.diplomaPerformance}</span>
                                    </div>
                                )}
                                {profile?.class10Performance && (
                                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Class 10</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile.class10Performance}</span>
                                    </div>
                                )}
                                {(!profile?.class12Performance && !profile?.diplomaPerformance && !profile?.class10Performance) && (
                                    <p className="italic text-slate-400 text-xs text-center">No history details added.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Resume Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between items-start hover:shadow-md transition-shadow">
                            <input
                                type="file"
                                ref={resumeInputRef}
                                onChange={handleResumeUpdate}
                                className="hidden"
                                accept=".pdf"
                                aria-label="Upload resume PDF"
                                title="Upload resume PDF"
                            />
                            <div className="w-full">
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl w-fit text-blue-600 dark:text-blue-400 mb-3">
                                    <ion-icon name="document-text-outline" className="text-xl"></ion-icon>
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">My Resume</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                    {profile?.resumePath ? "File Uploaded" : "No File"}
                                </p>
                            </div>
                            <button onClick={() => resumeInputRef.current?.click()} className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 py-2 px-3 rounded-lg transition-colors w-full text-center">
                                {profile?.resumePath ? "Update PDF" : "Upload PDF"}
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between items-start hover:shadow-md transition-shadow">
                            <div className="w-full">
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-2.5 rounded-xl w-fit text-purple-600 dark:text-purple-400 mb-3">
                                    <ion-icon name="scan-circle-outline" className="text-xl"></ion-icon>
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Analyzer</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Get ATS Score</p>
                            </div>
                            <button onClick={handleAnalyzeResumeClick} disabled={isAnalyzing} className="mt-4 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 py-2 px-3 rounded-lg transition-colors w-full text-center">
                                {isAnalyzing ? 'Scanning...' : 'Run Check'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Roadmaps */}
                <div className="w-full md:w-2/3 space-y-8">
                     <div>
                        <h2 className="roadmap-title-font text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <ion-icon name="compass" className="text-blue-600 dark:text-blue-400"></ion-icon>
                            Active Journey
                        </h2>
                        {activeRoadmap ? (
                            <div className="glass-card p-0 border-0 overflow-hidden shadow-lg group">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Current Skill</div>
                                        <h3 className="text-3xl font-bold">{activeRoadmap.skill}</h3>
                                    </div>
                                    <ion-icon name="rocket" className="absolute -right-4 -bottom-4 text-9xl text-white opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500"></ion-icon>
                                </div>
                                <div className="p-6 bg-white dark:bg-slate-800">
                                    <div className="flex justify-between text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">
                                        <span>Course Progress</span>
                                        <span>{Math.round(activeRoadmap.progress || 0)}%</span>
                                    </div>
                                    <progress
                                        className="dashboard-progress-bar dashboard-progress-bar-active mb-6"
                                        value={Math.max(0, Math.min(100, activeRoadmap.progress || 0))}
                                        max={100}
                                        aria-label="Active roadmap progress"
                                    />
                                    <div className="flex justify-end">
                                        <button onClick={() => onSelectRoadmap(activeRoadmap)} className="dynamic-button !py-2 !px-6 text-sm flex items-center gap-2">
                                            Continue Learning <ion-icon name="arrow-forward"></ion-icon>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card p-10 text-center border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl text-slate-400 dark:text-slate-500">
                                    <ion-icon name="map-outline"></ion-icon>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">No Active Path</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto">Select a skill to start generating your personalized learning roadmap.</p>
                                <div className="flex justify-center gap-3">
                                    <button onClick={onImportRoadmap} className="px-5 py-2.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                        <ion-icon name="qr-code-outline"></ion-icon> Import
                                    </button>
                                    <button onClick={onNewRoadmap} className="dynamic-button !py-2.5 !px-6 text-sm">Start New Path</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <ion-icon name="library-outline"></ion-icon> Saved Roadmaps
                        </h2>
                        {savedRoadmaps.length === 0 ? (
                            <p className="text-slate-500 italic text-sm pl-1">No saved roadmaps yet.</p>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {savedRoadmaps.map((map) => (
                                    <div key={map.id} className="glass-card p-5 cursor-pointer hover:border-blue-400 group transition-all duration-200 bg-white dark:bg-slate-800" onClick={() => onSelectRoadmap(map)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{map.skill}</h4>
                                            {map.status === 'completed' && <ion-icon name="checkmark-circle" className="text-green-500 text-lg"></ion-icon>}
                                        </div>
                                        <div className="mt-4">
                                            <div className="flex justify-between text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-1">
                                                <span>{map.roadmap.length} Weeks</span>
                                                <span className={map.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>{Math.round(map.progress || 0)}%</span>
                                            </div>
                                            <progress
                                                className={`dashboard-progress-bar dashboard-progress-bar-saved ${map.status === 'completed' ? 'dashboard-progress-complete' : 'dashboard-progress-active'}`}
                                                value={Math.max(0, Math.min(100, map.progress || 0))}
                                                max={100}
                                                aria-label={`${map.skill} progress`}
                                            />
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                            <button onClick={(e) => map.id && initiateActivation(e, map.id)} className="text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
                                                Set as Active
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {showConfirmModal && (
                <Modal onClose={() => setShowConfirmModal(false)}>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            <ion-icon name="swap-horizontal"></ion-icon>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Switch Active Roadmap?</h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">Your current progress will be saved, but this new roadmap will become your main focus on the dashboard.</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                            <button onClick={confirmActivation} className="dynamic-button !py-2 !px-6 text-sm">Confirm Switch</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Dashboard;
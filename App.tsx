import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { UserProfile, Suggestion, RoadmapData, ChatMessage, Project, RealWorldScenario, ProjectDetails, SetupStep, TimelineEvent, CareerDetails, MockInterview, QuizQuestion, Flashcard, ConceptConnection, Debate, CareerRecommendation, Toughness, OfflineCenter, Career, AcademicSuggestion, ResumeAnalysis, AssessmentResult } from './types';
import * as GeminiService from './services/geminiService';
import { supabase, getCurrentProfile, getPublicRoadmap, updateRoadmapWeek, updateRoadmapProgress, saveProfileFromOnboarding } from './services/supabaseService';
import BackgroundAnimation from './components/BackgroundAnimation';
import BackgroundEmojis from './components/BackgroundEmojis';
import IntroOverlay from './components/IntroOverlay';
import Header from './components/Header';
import InputForm from './components/InputForm';
import Suggestions from './components/Suggestions';
import ConfigureRoadmap from './components/ConfigureRoadmap';
import Roadmap from './components/Roadmap';
import AiCoachFab from './components/AiCoachFab';
import AiCoachModal from './components/AiCoachModal';
import Modal from './components/Modal';
import QuizModal from './components/QuizModal';
import FlashcardModal from './components/FlashcardModal';
import ProjectModal from './components/ProjectModal';
import ProjectDetailsModal from './components/ProjectDetailsModal';
import DeepDiveModal from './components/DeepDiveModal';
import DebateModal from './components/DebateModal';
import CareerDetailsModal from './components/CareerDetailsModal';
import MockInterviewModal from './components/MockInterviewModal';
import SkillLevelQuizModal from './components/SkillLevelQuizModal';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TrainerDashboard from './components/TrainerDashboard';
import PolicymakerDashboard from './components/PolicymakerDashboard';
import Onboarding from './components/Onboarding';
import { Loader } from './components/Loader';
import ProfileEditModal from './components/ProfileEditModal';
import ImportModal from './components/ImportModal';
import ShareModal from './components/ShareModal';
import WeekAssessmentModal from './components/WeekAssessmentModal';
import {
    createRoadmapJob,
    runJob,
    getJob,
    getActiveRoadmapJob,
    getPersistedWorkflowState,
    clearWorkflowState,
    toRoadmapResult,
} from './services/jobService';

const translations = {
    'English': {
        headerTitle: 'Horizon AI',
        headerSubtitle: 'Chart your course to new skills. Your personal AI learning navigator.',
        formTitle: 'Start New Roadmap'
    },
    'हिन्दी': {
        headerTitle: 'क्षितिज AI',
        headerSubtitle: 'नए कौशलों के लिए अपना रास्ता बनाएं। आपका व्यक्तिगत AI लर्निंग नेविगेटर।',
        formTitle: 'नया रोडमैप शुरू करें'
    },
    'தமிழ்': {
        headerTitle: 'ஹொரைசன் AI',
        headerSubtitle: 'புதிய திறன்களுக்கான உங்கள் வழியை வரையுங்கள். உங்கள் தனிப்பட்ட AI கற்றல் நேவிகேட்டர்.',
        formTitle: 'புதிய சாலைவரைபடத்தைத் தொடங்கவும்'
    },
    'Español': {
        headerTitle: 'Horizon AI',
        headerSubtitle: 'Traza tu rumbo hacia nuevas habilidades. Tu navegador de aprendizaje personal con IA.',
        formTitle: 'Iniciar Nueva Hoja de Ruta'
    },
    'Français': {
        headerTitle: 'Horizon AI',
        headerSubtitle: 'Tracez votre parcours vers de nouvelles compétences. Votre navigateur d\'apprentissage personnel IA.',
        formTitle: 'Nouvelle Feuille de Route'
    }
};

type AnimationType = 'net' | 'globe';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [userProfile, setUserProfile] = useState<UserProfile>({
        skills: '',
        interests: '',
        learningStyle: 'Balanced',
        academicLevel: 'Graduation',
        stream: 'Engineering',
        academicCourse: 'CSE',
        specialization: 'Machine Learning',
        focusArea: 'General'
    });
    
    // Application State managed via Routes now, but data retained here
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [selectedSkill, setSelectedSkill] = useState<string>('');
    const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [language, setLanguage] = useState<keyof typeof translations>('English');
    const [animationType, setAnimationType] = useState<AnimationType>('net');
    const [hasSavedSession, setHasSavedSession] = useState<boolean>(false);
    const [theme, setTheme] = useState<Theme>('light');
    const [showEmojis, setShowEmojis] = useState(true);
    const [isIntroVisible, setIsIntroVisible] = useState(true);

    // Modal States
    const [isCoachModalVisible, setCoachModalVisible] = useState<boolean>(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isDebateModalVisible, setDebateModalVisible] = useState<boolean>(false);
    const [debateHistory, setDebateHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);
    const [debateTopic, setDebateTopic] = useState('');
    const [isQuizModalVisible, setQuizModalVisible] = useState<boolean>(false);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [isFlashcardModalVisible, setFlashcardModalVisible] = useState<boolean>(false);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [isProjectModalVisible, setProjectModalVisible] = useState<boolean>(false);
    const [isProjectDetailsModalVisible, setProjectDetailsModalVisible] = useState<boolean>(false);
    const [projectSuggestions, setProjectSuggestions] = useState<Project[]>([]);
    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [isDeepDiveModalVisible, setDeepDiveModalVisible] = useState<boolean>(false);
    const [deepDiveData, setDeepDiveData] = useState<{ what_is_it: string; why_useful: string; why_learn: string; } | null>(null);
    const [isCareerDetailsModalVisible, setCareerDetailsModalVisible] = useState<boolean>(false);
    const [careerDetails, setCareerDetails] = useState<CareerDetails | null>(null);
    const [isMockInterviewModalVisible, setMockInterviewModalVisible] = useState<boolean>(false);
    const [mockInterview, setMockInterview] = useState<MockInterview | null>(null);
    const [currentInterviewRole, setCurrentInterviewRole] = useState<string>('');
    const [isSkillLevelQuizVisible, setSkillLevelQuizVisible] = useState<boolean>(false);
    const [skillLevelQuizQuestions, setSkillLevelQuizQuestions] = useState<QuizQuestion[]>([]);
    const [determinedSkillLevel, setDeterminedSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Expert'>();
    const [modalContent, setModalContent] = useState<{ type: string; data: any } | null>(null);
    const [isProfileEditModalVisible, setProfileEditModalVisible] = useState(false);
    const [activeRoadmapJobId, setActiveRoadmapJobId] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authResolved, setAuthResolved] = useState(false);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);
    const roadmapPollRef = useRef<number | null>(null);

    const stopRoadmapPolling = () => {
        if (roadmapPollRef.current) {
            window.clearInterval(roadmapPollRef.current);
            roadmapPollRef.current = null;
        }
    };

    const resolveRoadmapJob = async (jobId: string) => {
        const job = await getJob(jobId);
        if (job.status === 'completed') {
            const result = toRoadmapResult(job);
            if (result) {
                setRoadmapData(result);
                setSelectedSkill(result.skill || selectedSkill);
                clearWorkflowState();
                stopRoadmapPolling();
                setActiveRoadmapJobId(null);
                navigate('/roadmap');
                return;
            }
        }

        if (job.status === 'failed') {
            setErrorMessage(job.error || 'Roadmap generation failed.');
            clearWorkflowState();
            stopRoadmapPolling();
            setActiveRoadmapJobId(null);
            navigate('/error');
        }
    };

    const startRoadmapPolling = (jobId: string) => {
        stopRoadmapPolling();
        roadmapPollRef.current = window.setInterval(() => {
            resolveRoadmapJob(jobId).catch(() => {
                // Keep polling through transient network failures.
            });
        }, 3000);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsIntroVisible(false);
            checkSession();
        }, 3000);
        
        const savedTheme = localStorage.getItem('horizon-theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
            if (savedTheme === 'dark') document.documentElement.classList.add('dark');
        } 

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const { data: subscription } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                setAuthResolved(true);
                clearWorkflowState();
                stopRoadmapPolling();
                navigate('/login');
            }

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await checkSession();
            }
        });

        return () => {
            subscription.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        return () => {
            stopRoadmapPolling();
        };
    }, []);

    useEffect(() => {
        const tryResume = async () => {
            if (!userProfile?.id) return;

            const persisted = getPersistedWorkflowState();
            const localJobId = persisted.jobId;

            if (localJobId) {
                setActiveRoadmapJobId(localJobId);
                navigate('/loading');
                startRoadmapPolling(localJobId);
                try {
                    await runJob(localJobId);
                } catch {
                    // Ignore if already running/completed, polling resolves final state.
                }
                return;
            }

            try {
                const active = await getActiveRoadmapJob();
                if (active) {
                    setActiveRoadmapJobId(active.id);
                    navigate('/loading');
                    startRoadmapPolling(active.id);
                }
            } catch {
                // Soft-fail for resume checks.
            }
        };

        tryResume();
    }, [userProfile?.id]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('horizon-theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const toggleEmojis = () => {
        setShowEmojis(prev => !prev);
    };

    const checkSession = async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
    
            if (session) {
                setIsAuthenticated(true);
                let profile = await getCurrentProfile();
                
                if (!profile) {
                    const stubProfile: UserProfile = {
                        id: session.user.id,
                        role: 'user',
                        fullName: session.user.email?.split('@')[0] || 'User',
                        skills: '', interests: '',
                        learningStyle: 'Balanced', academicLevel: 'Graduation', stream: 'General', focusArea: 'General'
                    };
                    await saveProfileFromOnboarding(stubProfile);
                    profile = stubProfile;
                }

                if (profile) {
                    setUserProfile(profile);

                    if (location.pathname === '/login' || location.pathname === '/auth' || location.pathname === '/') {
                        navigate('/create');
                    }
                } else {
                    setIsAuthenticated(false);
                    navigate('/login');
                }
            } else {
                setIsAuthenticated(false);
                if (location.pathname !== '/login' && location.pathname !== '/auth') {
                    navigate('/login');
                }
            }
        } catch (error: any) {
            console.error("Error during session check:", error);
            setErrorMessage("Could not connect to your session. Please check your internet connection and try again.");
            setIsAuthenticated(false);
            navigate('/login');
        } finally {
            setAuthResolved(true);
        }
    };

    const handleAuthSuccess = async () => {
        await checkSession();
        navigate('/create');
    };

    const handleOnboardingComplete = (profileData: Partial<UserProfile>) => {
        setUserProfile(prev => ({...prev, ...profileData}));
        navigate('/create');
    };

    const handleAnimationToggle = () => {
        setAnimationType(prev => prev === 'net' ? 'globe' : 'net');
    };

    const handleProfileSubmit = async (profile: UserProfile) => {
        setIsSubmittingForm(true);
        setUserProfile(profile);
        setErrorMessage('');
        navigate('/loading');
        try {
            const effectiveSkill = profile.skills || profile.interests;
            if (!effectiveSkill) {
                setErrorMessage("Please enter at least one skill or interest.");
                navigate('/create');
                return;
            }
            const suggestions = await GeminiService.getSkillSuggestions(profile);
            if (!suggestions || suggestions.length === 0) {
                setErrorMessage("No skill suggestions could be generated. Please try a different skill or interest.");
                navigate('/create');
                return;
            }
            setSuggestions(suggestions);
            navigate('/suggestions');
        } catch (error: any) {
            const msg = error?.message || 'Something went wrong. Please try again.';
            setErrorMessage(msg);
            navigate('/create');
        } finally {
            setIsSubmittingForm(false);
        }
    };


    const handleRefresh = () => handleProfileSubmit(userProfile);

    const handleSelectSkill = (skill: string) => {
        setSelectedSkill(skill);
        navigate('/configure');
    };

    const handleGenerateRoadmap = async (weeks: string, level: string) => {
        navigate('/loading');
        setErrorMessage('');
        try {
            const job = await createRoadmapJob(selectedSkill, weeks, level, userProfile);
            setActiveRoadmapJobId(job.id);
            startRoadmapPolling(job.id);
            await runJob(job.id).catch(() => {
                // Job can already be running/completed; polling finalizes UI.
            });
            await resolveRoadmapJob(job.id);
        } catch (error: any) {
            setErrorMessage(error.message);
            navigate('/error');
        }
    };
    
    const handleStartOver = () => {
        clearWorkflowState();
        stopRoadmapPolling();
        setActiveRoadmapJobId(null);
        setRoadmapData(null);
        setSelectedSkill('');
        setSuggestions([]);
        navigate('/create');
    };

    const handleSelectSavedRoadmap = async (savedMap: RoadmapData) => {
        setRoadmapData(savedMap);
        setSelectedSkill(savedMap.skill);
        navigate('/roadmap');
    };
    
    const handleRefreshMockInterview = async () => {
        if (!currentInterviewRole) return;
        try {
            const result = await GeminiService.getMockInterview(currentInterviewRole);
            setMockInterview(result);
        } catch (error) {
            console.error("Failed to refresh interview", error);
        }
    };

    const handleImportSuccess = (importedMap: RoadmapData) => {
        setRoadmapData(importedMap);
        setSelectedSkill(importedMap.skill);
        navigate('/roadmap');
        setModalContent(null);
        alert(`Imported roadmap for ${importedMap.skill} successfully!`);
    };

    const handleAssessmentPass = async (weekIndex: number, result: AssessmentResult) => {
        if (!roadmapData) return;
        
        const updatedWeeks = roadmapData.roadmap.map((week, index) => {
            if (index === weekIndex) {
                return { 
                    ...week, 
                    completed: true, 
                    completedAt: new Date().toISOString(), 
                    earnedPoints: roadmapData.status === 'active' ? result.pointsAwarded : 0,
                    score: result.score 
                };
            }
            return week;
        });

        const completedCount = updatedWeeks.filter(w => w.completed).length;
        const newProgress = (completedCount / updatedWeeks.length) * 100;
        
        const updatedRoadmap: RoadmapData = {
            ...roadmapData,
            roadmap: updatedWeeks,
            progress: newProgress,
        };

        setRoadmapData(updatedRoadmap);
        
        if (roadmapData.id) {
            try {
                const weekToUpdate = updatedWeeks[weekIndex];
                await updateRoadmapWeek(roadmapData.id, weekToUpdate.week, {
                    completed: true,
                    score: result.score,
                    earned_points: roadmapData.status === 'active' ? result.pointsAwarded : 0,
                    completed_at: new Date().toISOString()
                });

                await updateRoadmapProgress(roadmapData.id, newProgress);
            } catch (err) {
                console.error("Failed to save progress to database", err);
            }
        }
        
        setModalContent(null);
    };

    const handleFeatureClick = async (type: string, data: any) => {
        if (type === 'import-roadmap' || type === 'share-roadmap') {
            setModalContent({ type, data });
            return;
        }

        setModalContent({ type: 'loading', data: null });
        
        try {
            let result: any;
            switch(type) {
                case 'eli5':
                    result = await GeminiService.getELI5(data.skill, data.theme);
                    break;
                case 'scenario':
                    result = await GeminiService.getRealWorldScenarios(data.skill, data.theme);
                    break;
                case 'quiz':
                    result = await GeminiService.getQuiz(data.skill, data.theme);
                    setQuizQuestions(result);
                    setModalContent({ type, data: { ...data, result } });
                    return;
                case 'week-assessment':
                    result = await GeminiService.getWeekAssessment(data.skill, data.theme);
                    setModalContent({ type, data: { ...data, result } });
                    return;
                case 'flashcards':
                    result = await GeminiService.getFlashcards(data.skill, data.theme);
                    setFlashcards(result);
                    setFlashcardModalVisible(true);
                    setModalContent(null);
                    return;
                 case 'visualize':
                    result = await GeminiService.generateImage(`A simple, clear, educational diagram explaining the concept of "${data.theme}" in the field of ${data.skill}. Style: digital art, vibrant colors, clear labels.`);
                    if (result === null) {
                         throw new Error("Image generation unavailable at this time.");
                    }
                    break;
                case 'connections':
                    result = await GeminiService.getConceptConnections(data.skill, data.theme);
                    break;
                case 'debate':
                    result = await GeminiService.getDebateTopic(data.skill, data.theme);
                    setDebateTopic(result.topic);
                    setDebateHistory([{ role: 'antagonist', parts: [{ text: result.opening_statement }] }]);
                    setDebateModalVisible(true);
                    setModalContent(null);
                    return;
                case 'deep-dive':
                    result = await GeminiService.getDeepDive(data.skill);
                    setDeepDiveData(result);
                    setDeepDiveModalVisible(true);
                    setModalContent(null);
                    return;
                 case 'setup-guide':
                    result = await GeminiService.getSetupGuide(data.skill);
                    break;
                case 'career-details':
                     result = await GeminiService.getCareerDetails(data.careerTitle, data.skill);
                     setCareerDetails(result);
                     setCareerDetailsModalVisible(true);
                     setModalContent(null);
                     return;
                case 'mock-interview':
                     setCurrentInterviewRole(data.careerTitle);
                     result = await GeminiService.getMockInterview(data.careerTitle);
                     setMockInterview(result);
                     setMockInterviewModalVisible(true);
                     setModalContent(null);
                     return;
                case 'career-recommender':
                    result = await GeminiService.getCareerRecommendation(userProfile);
                    break;
                case 'timeline':
                    result = await GeminiService.getTimelineEvents(userProfile, data.skill);
                    break;
                case 'stuck':
                    const problem = prompt(`Describe what you're stuck on regarding "${data.theme}":`);
                    if(problem) {
                        result = await GeminiService.getHelpForStuck(data.skill, data.theme, problem);
                    } else {
                        setModalContent(null);
                        return;
                    }
                    break;
                case 'projects':
                     result = await GeminiService.getProjectSuggestions(data.skill, userProfile.interests);
                     setProjectSuggestions(result);
                     setProjectModalVisible(true);
                     setModalContent(null);
                     return;
                case 'project-details':
                     result = await GeminiService.getProjectDetails(data.skill, data.projectTitle);
                     setProjectDetails(result);
                     setProjectDetailsModalVisible(true);
                     setModalContent(null);
                     return;
                case 'toughness':
                    result = await GeminiService.getToughness(data.skill);
                    break;
                case 'offline-centers':
                    result = await GeminiService.getOfflineCenters(data.skill);
                    break;
                case 'career-paths':
                    result = await GeminiService.getCareerPaths(data.skill, data.resumeText);
                    break;
                case 'next-degree-suggestion':
                    result = await GeminiService.getAcademicSuggestions(userProfile);
                    break;
                case 'resume-analyzer':
                    result = await GeminiService.analyzeResume(data.resumeText);
                    break;
                default:
                    throw new Error("Unknown feature type");
            }
            setModalContent({ type, data: { ...data, result } });
        } catch(e: any) {
            setModalContent({ type: 'error', data: e.message });
        }
    };
    
    const handleCoachSend = async (message: string) => {
        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: message }];
        setChatHistory(newHistory);
        const response = await GeminiService.getAiCoachResponse(selectedSkill, message);
        setChatHistory(prev => [...prev, { role: 'model', content: response }]);
    };

    const handleDebateSend = async (message: string) => {
        const newHistory = [...debateHistory, { role: 'user', parts: [{ text: message }] }];
        setDebateHistory(newHistory);
        const response = await GeminiService.getDebateRebuttal(newHistory);
        setDebateHistory(prev => [...prev, { role: 'antagonist', parts: [{ text: response }] }]);
    };
    
    const handleTakeSkillQuiz = async () => {
        setSkillLevelQuizVisible(true);
        setSkillLevelQuizQuestions([]); // Clear old questions
        const questions = await GeminiService.getSkillLevelQuiz(selectedSkill);
        setSkillLevelQuizQuestions(questions);
    };
    
    const handleCompleteSkillQuiz = (level: 'Beginner' | 'Intermediate' | 'Expert') => {
        setDeterminedSkillLevel(level);
        setSkillLevelQuizVisible(false);
    };

    // Shared Shared Roadmap Loader for /?roadmapId=...
    useEffect(() => {
        const loadSharedMap = async () => {
             const urlParams = new URLSearchParams(window.location.search);
             const roadmapId = urlParams.get('roadmapId');

            if (roadmapId) {
                try {
                    navigate('/loading');
                    const sharedData = await getPublicRoadmap(roadmapId);
                    setRoadmapData(sharedData);
                    setSelectedSkill(sharedData.skill);
                    navigate('/roadmap');
                    
                    // Cleanup URL to avoid reload loop or confusion, but keep context
                    // Ideally we'd move to /roadmap/shared/:id but adhering to simpler current structure
                } catch (e) {
                    console.error("Failed to load shared roadmap", e);
                    setErrorMessage("The shared roadmap could not be found or is private.");
                    navigate('/error');
                }
            }
        };
        loadSharedMap();
    }, []);

    const isDashboardRoute = location.pathname === '/dashboard';
    const showDashboardButton = !!userProfile.id && !isDashboardRoute;

    if (!authResolved) {
        return <Loader message="Restoring your secure session..." />;
    }

    const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        if (!isAuthenticated) {
            return <Navigate to="/login" replace />;
        }
        return <>{children}</>;
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300 relative">
            <BackgroundAnimation animationType={animationType} />
            <BackgroundEmojis stream={userProfile.stream} branch={userProfile.academicCourse} show={showEmojis} />

            <IntroOverlay isVisible={isIntroVisible} />
            
            <div className={`flex-grow flex flex-col transition-opacity duration-500 ${isIntroVisible ? 'opacity-0' : 'opacity-100'} relative z-10`}>
                {location.pathname !== '/login' && (
                    <Header 
                        language={language} 
                        onLanguageChange={(lang) => setLanguage(lang as keyof typeof translations)} 
                        title={translations[language].headerTitle}
                        subtitle={translations[language].headerSubtitle}
                        onToggleAnimation={handleAnimationToggle}
                        currentAnimation={animationType}
                        onResumeSession={() => {}}
                        hasSavedSession={hasSavedSession}
                        onShowDashboard={() => navigate('/dashboard')}
                        showDashboardButton={showDashboardButton}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        onToggleEmojis={toggleEmojis}
                        showEmojis={showEmojis}
                    />
                )}
                <main className="flex-grow container mx-auto px-3 sm:px-4 pb-8">
                    <Routes>
                        <Route path="/login" element={isAuthenticated ? <Navigate to="/create" replace /> : <Auth onAuthSuccess={handleAuthSuccess} />} />
                        <Route path="/auth" element={<Navigate to="/login" replace />} />
                        <Route path="/onboarding" element={<Navigate to="/create" replace />} />
                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                            {userProfile.role === 'trainer' ? <TrainerDashboard /> :
                            userProfile.role === 'admin' ? <PolicymakerDashboard /> :
                            <Dashboard
                                onSelectRoadmap={handleSelectSavedRoadmap}
                                onNewRoadmap={() => navigate('/create')}
                                onImportRoadmap={() => handleFeatureClick('import-roadmap', null)}
                                onAnalyzeResume={(text) => handleFeatureClick('resume-analyzer', { resumeText: text })}
                                onEditProfile={() => setProfileEditModalVisible(true)}
                            />}
                            </ProtectedRoute>
                        } />
                        <Route path="/create" element={
                            <ProtectedRoute>
                            <InputForm existingProfile={userProfile} onSubmit={handleProfileSubmit} title={translations[language].formTitle} isLoading={isSubmittingForm} errorMessage={errorMessage} />
                            </ProtectedRoute>
                        } />
                        <Route path="/suggestions" element={
                            <ProtectedRoute>
                            <Suggestions suggestions={suggestions} onSelect={handleSelectSkill} onRefresh={handleRefresh} />
                            </ProtectedRoute>
                        } />
                        <Route path="/configure" element={
                            <ProtectedRoute>
                            <ConfigureRoadmap 
                                skillName={selectedSkill} 
                                interestDomain={userProfile.interests} 
                                onGenerate={handleGenerateRoadmap} 
                                onBack={() => navigate('/suggestions')} 
                                onTakeQuiz={handleTakeSkillQuiz} 
                                determinedSkillLevel={determinedSkillLevel}
                            />
                            </ProtectedRoute>
                        } />
                        <Route path="/roadmap" element={
                            <ProtectedRoute>
                            {roadmapData ? (
                                <Roadmap 
                                    data={roadmapData} 
                                    userProfile={userProfile} 
                                    onStartOver={handleStartOver} 
                                    onFeatureClick={handleFeatureClick} 
                                    setRoadmapData={setRoadmapData} 
                                />
                            ) : <Navigate to="/create" />
                            }
                            </ProtectedRoute>
                        } />
                        <Route path="/loading" element={<ProtectedRoute><Loader message="Working our magic..." /></ProtectedRoute>} />
                        <Route path="/error" element={
                            <div className="flex items-center justify-center py-12 px-4">
                                <div className="glass-card max-w-lg w-full p-8 text-center">
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h2>
                                    <p className="text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-6 text-sm">
                                        {errorMessage || 'An unexpected error occurred. Please try again.'}
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                            ← Go Back
                                        </button>
                                        <button onClick={handleStartOver} className="dynamic-button">
                                            Start Over
                                        </button>
                                    </div>
                                </div>
                            </div>
                        } />

                        <Route path="/" element={<Navigate to={isAuthenticated ? '/create' : '/login'} replace />} />
                        <Route path="*" element={<Navigate to={isAuthenticated ? '/create' : '/login'} replace />} />
                    </Routes>
                </main>
            </div>


            {roadmapData && location.pathname === '/roadmap' && <AiCoachFab onOpen={() => setCoachModalVisible(true)} />}

            {isCoachModalVisible && <AiCoachModal history={chatHistory} onSend={handleCoachSend} onClose={() => setCoachModalVisible(false)} title={`AI Coach for ${selectedSkill}`} />}
            {isDebateModalVisible && <DebateModal history={debateHistory} onSend={handleDebateSend} onClose={() => setDebateModalVisible(false)} title={debateTopic} />}
            {isFlashcardModalVisible && <Modal title="Flashcards" onClose={() => setFlashcardModalVisible(false)}><FlashcardModal flashcards={flashcards} /></Modal>}
            {isProjectModalVisible && <Modal title="Project Ideas" onClose={() => setProjectModalVisible(false)}><ProjectModal projects={projectSuggestions} onSelectProject={(title) => handleFeatureClick('project-details', { skill: selectedSkill, projectTitle: title })} /></Modal>}
            {isProjectDetailsModalVisible && projectDetails && <Modal title="Project Blueprint" onClose={() => setProjectDetailsModalVisible(false)}><ProjectDetailsModal details={projectDetails} /></Modal>}
            {isDeepDiveModalVisible && deepDiveData && <Modal title={`Deep Dive: ${selectedSkill}`} onClose={() => setDeepDiveModalVisible(false)}><DeepDiveModal data={deepDiveData} /></Modal>}
            {isCareerDetailsModalVisible && careerDetails && <Modal title={`Career Details`} onClose={() => setCareerDetailsModalVisible(false)}><CareerDetailsModal details={careerDetails} onMockInterview={() => { setCareerDetailsModalVisible(false); handleFeatureClick('mock-interview', { careerTitle: careerDetails.key_roles[0] })}} /></Modal>}
            {isMockInterviewModalVisible && mockInterview && <Modal title="Mock Interview" onClose={() => setMockInterviewModalVisible(false)}><MockInterviewModal interview={mockInterview} onRefresh={handleRefreshMockInterview}/></Modal>}
            {isSkillLevelQuizVisible && <SkillLevelQuizModal questions={skillLevelQuizQuestions} onComplete={handleCompleteSkillQuiz} onClose={() => setSkillLevelQuizVisible(false)} title={`Skill Assessment: ${selectedSkill}`} skillName={selectedSkill}/>}
            {isProfileEditModalVisible && userProfile && (
                <ProfileEditModal 
                    userProfile={userProfile} 
                    onClose={() => setProfileEditModalVisible(false)}
                    onSave={() => {
                        setProfileEditModalVisible(false);
                        checkSession(); // Refetch profile data
                    }}
                />
            )}

            {modalContent && (
                <Modal title={modalContent.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} onClose={() => setModalContent(null)}>
                    {modalContent.type === 'loading' && <Loader message="Fetching AI insight..." />}
                    {modalContent.type === 'error' && <p className="text-red-500">{modalContent.data}</p>}
                    {modalContent.type === 'import-roadmap' && (
                        <ImportModal onClose={() => setModalContent(null)} onImportSuccess={handleImportSuccess} />
                    )}
                    {modalContent.type === 'share-roadmap' && (
                        <ShareModal roadmapId={modalContent.data.roadmapId} skillName={modalContent.data.skill} />
                    )}
                    
                    {/* New Week Assessment Modal */}
                    {modalContent.type === 'week-assessment' && (
                        <WeekAssessmentModal 
                            questions={modalContent.data.result} 
                            roadmapId={roadmapData?.id}
                            skill={modalContent.data.skill}
                            theme={modalContent.data.theme}
                            weekIndex={modalContent.data.weekIndex}
                            roadmapStatus={roadmapData?.status}
                            onPass={(result) => handleAssessmentPass(modalContent.data.weekIndex, result)}
                            onClose={() => setModalContent(null)}
                        />
                    )}

                    {modalContent.type === 'eli5' && <p>{modalContent.data.result}</p>}
                    {modalContent.type === 'stuck' && <p>{modalContent.data.result}</p>}
                    {modalContent.type === 'visualize' && (
                        modalContent.data.result ? 
                        <img src={`data:image/jpeg;base64,${modalContent.data.result}`} alt="Generated visualization" className="rounded-lg shadow-md" /> :
                        <div className="bg-slate-100 p-8 rounded-lg text-center text-slate-500 italic">Visualization temporarily unavailable.</div>
                    )}
                    {modalContent.type === 'scenario' && (
                        <div>
                            {(modalContent.data.result as RealWorldScenario[]).map(s => (
                                <div key={s.scenario_title} className="mb-4">
                                    <h4 className="font-bold">{s.scenario_title}</h4>
                                    <p>{s.problem_statement}</p>
                                    <ul className="list-disc list-inside mt-2">{s.key_tasks.map(t => <li key={t}>{t}</li>)}</ul>
                                </div>
                            ))}
                        </div>
                    )}
                     {modalContent.type === 'quiz' && (
                        <QuizModal 
                            questions={modalContent.data.result} 
                            roadmapId={roadmapData?.id} 
                            skill={selectedSkill} 
                            theme={modalContent.data.theme}
                            weekIndex={modalContent.data.weekIndex}
                            startedAt={modalContent.data.startedAt}
                        />
                    )}
                    {modalContent.type === 'connections' && (
                        <div className="space-y-4">
                            <div className="bg-cyan-50 dark:bg-cyan-900/30 p-4 rounded-xl border border-cyan-100 dark:border-cyan-800 mb-4">
                                <p className="text-cyan-800 dark:text-cyan-200 text-sm">
                                    <ion-icon name="information-circle" className="align-middle mr-1"></ion-icon>
                                    Understanding how <strong>{modalContent.data.theme}</strong> connects to other disciplines helps deepen your knowledge.
                                </p>
                            </div>
                            {(modalContent.data.result as ConceptConnection[]).map((c, i) => (
                                <div key={i} className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2 text-lg">
                                        <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center">
                                            <ion-icon name="git-network-outline"></ion-icon>
                                        </div>
                                        {c.field}
                                    </h4>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed ml-10">{c.explanation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {modalContent.type === 'setup-guide' && (
                        <div>
                            {(() => {
                                const steps = (modalContent.data.result as SetupStep[]) || [];
                                if (!Array.isArray(steps) || steps.length === 0) {
                                    return <p className="text-slate-500">No setup steps were returned. Please try again.</p>;
                                }

                                return steps.map((s, idx) => {
                                    const key = `${s.title}-${idx}`;
                                    const href = s.resourceLink && /^https?:\/\//i.test(s.resourceLink)
                                        ? s.resourceLink
                                        : `https://google.com/search?q=${encodeURIComponent(s.searchQuery || s.title)}`;

                                    return (
                                        <div key={key} className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <h4 className="font-bold">{s.title}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{s.description}</p>
                                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm inline-block mt-2">Open resource</a>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                    {modalContent.type === 'career-recommender' && (
                        <div>
                            <h4 className="font-bold text-lg text-blue-600">{(modalContent.data.result as CareerRecommendation).career_title}</h4>
                            <p className="my-2">{(modalContent.data.result as CareerRecommendation).reason}</p>
                            <h5 className="font-semibold mt-4">Next Steps:</h5>
                            <ul className="list-disc list-inside">
                                {(modalContent.data.result as CareerRecommendation).next_steps.map(s => <li key={s}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                    {modalContent.type === 'timeline' && (
                        <div>
                             {(modalContent.data.result as TimelineEvent[]).map(e => (
                                <div key={e.eventName} className="mb-3">
                                    <p className="font-bold">{e.eventName} <span className="text-xs font-normal bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-full">{e.eventType}</span></p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{e.estimatedDate}: {e.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {modalContent.type === 'toughness' && (
                        <div className="text-center">
                            <div className="text-6xl font-bold text-blue-600">{(modalContent.data.result as Toughness).toughness}/100</div>
                            <p className="mt-2 text-slate-600 dark:text-slate-300">{(modalContent.data.result as Toughness).justification}</p>
                        </div>
                    )}
                    {modalContent.type === 'offline-centers' && (
                        <div>
                            {(modalContent.data.result as OfflineCenter[]).map(c => (
                                <div key={c.name} className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-bold">{c.name}</h4>
                                    <p className="text-sm">{c.description}</p>
                                    <a href={`https://google.com/search?q=${encodeURIComponent(c.searchQuery)}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs">Search for places</a>
                                </div>
                            ))}
                        </div>
                    )}
                    {modalContent.type === 'career-paths' && (
                        <div className="space-y-3">
                            {(modalContent.data.result as Career[]).map(c => (
                                 <button key={c.title} onClick={() => handleFeatureClick('career-details', { careerTitle: c.title, skill: modalContent.data.skill })} className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-l-4 border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                    <h4 className="font-bold text-indigo-700 dark:text-indigo-400">{c.title}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{c.description}</p>
                                </button>
                            ))}
                        </div>
                    )}
                    {modalContent.type === 'next-degree-suggestion' && (
                         <div>
                            {(modalContent.data.result as AcademicSuggestion[]).map(s => (
                                 <div key={s.name} className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-bold">{s.name}</h4>
                                    <p className="text-sm">{s.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {modalContent.type === 'resume-analyzer' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="text-6xl font-bold text-blue-600">{(modalContent.data.result as ResumeAnalysis).score}/100</div>
                                <p className="mt-2 text-slate-600 dark:text-slate-300">{(modalContent.data.result as ResumeAnalysis).feedback}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-green-600 mb-2">Strengths</h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                                    {(modalContent.data.result as ResumeAnalysis).strengths.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                             <div>
                                <h4 className="font-bold text-lg text-red-600 mb-2">Areas for Improvement</h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                                    {(modalContent.data.result as ResumeAnalysis).improvements.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
};

export default App;
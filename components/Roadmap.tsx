import React, { useState, useEffect, useRef } from 'react';
import { RoadmapData, UserProfile, Toughness, JobTrendData, AcademicSuggestion, OfflineCenter, Career, SetupStep, RealWorldScenario, Platform, TimelineEvent, NewsArticle } from '../types';
import * as GeminiService from '../services/geminiService';
import { getEducationNews } from '../services/newsService';
import { saveRoadmap, setRoadmapAsActive, updateRoadmap, updateUserPoints, markRoadmapComplete, makeRoadmapPublic } from '../services/supabaseService';
import { Loader } from './Loader';
import JobTrendChart from './JobTrendChart';
interface RoadmapProps {
    data: RoadmapData;
    userProfile: UserProfile;
    onStartOver: () => void;
    onFeatureClick: (type: string, data: any) => void;
    setRoadmapData: React.Dispatch<React.SetStateAction<RoadmapData | null>>;
}

// --- Sub-components for cleaner code ---

const AIToolCard: React.FC<{ 
    icon: string; 
    label: string; 
    color: string; 
    onClick: (e: React.MouseEvent) => void;
    disabled?: boolean;
}> = ({ icon, label, color, onClick, disabled }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 
        ${disabled 
            ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed grayscale' 
            : `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-${color}-400 dark:hover:border-${color}-400 hover:shadow-md hover:-translate-y-1 group`
        }`}
    >
        <div className={`text-2xl mb-2 transition-colors ${disabled ? 'text-slate-400' : `text-${color}-500 group-hover:text-${color}-600`}`}>
            <ion-icon name={icon}></ion-icon>
        </div>
        <span className={`text-xs font-semibold text-center ${disabled ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{label}</span>
    </button>
);

const ResourceLink: React.FC<{ resource: { title: string, searchQuery: string } }> = ({ resource }) => (
    <a 
        href={`https://www.google.com/search?q=${encodeURIComponent(resource.searchQuery)}`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-sm transition-all duration-200 group"
    >
        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <ion-icon name="search" className="text-sm"></ion-icon>
        </div>
        <span className="font-medium text-slate-700 dark:text-slate-200 text-sm flex-grow">{resource.title}</span>
        <ion-icon name="open-outline" className="text-slate-400 dark:text-slate-500 text-lg group-hover:text-blue-500 dark:group-hover:text-blue-400"></ion-icon>
    </a>
);

const NewsCard: React.FC<{ article: NewsArticle }> = ({ article }) => (
    <a 
        href={article.link}
        target="_blank" 
        rel="noopener noreferrer" 
        className="block p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-sm transition-all duration-200 group mb-3"
    >
        <div className="flex gap-3">
            {article.image_url && (
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img src={article.image_url} alt="" className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                </div>
            )}
            <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">{article.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase font-semibold truncate max-w-[100px]">{article.source_id}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(article.pubDate).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    </a>
);

const RoadmapWeek: React.FC<{ 
    weekData: RoadmapData['roadmap'][0], 
    skillName: string, 
    onFeatureClick: RoadmapProps['onFeatureClick'], 
    index: number, 
    onStartWeek: (index: number) => void,
    onCompleteWeek: (index: number) => void,
    roadmapStatus: 'active' | 'saved' | 'completed' | undefined,
    isLast: boolean,
    isReadOnly: boolean,
    isTimeLocked: boolean,
    unlockDate: Date
}> = ({ weekData, skillName, onFeatureClick, index, onStartWeek, onCompleteWeek, roadmapStatus, isLast, isReadOnly, isTimeLocked, unlockDate }) => {
    
    return (
        <div className="flex items-start">
            <div className="flex flex-col items-center mr-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${weekData.completed ? 'bg-green-500 border-green-500 text-white' : (isTimeLocked ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300')} z-10`}>
                    {weekData.completed ? <ion-icon name="checkmark"></ion-icon> : (isTimeLocked ? <ion-icon name="lock-closed"></ion-icon> : <span className="font-bold">{weekData.week}</span>)}
                </div>
                {!isLast && <div className={`w-0.5 h-full bg-slate-200 dark:bg-slate-700 mt-[-2px]`}></div>}
            </div>

            <div className="flex-grow pb-10">
                <div className={`glass-card p-4 transition-all duration-300 ${weekData.completed ? 'border-green-300 dark:border-green-800 bg-green-50/30 dark:bg-green-900/20' : (isTimeLocked ? 'opacity-75 grayscale-[0.5]' : '')}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Week {weekData.week}</p>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{weekData.theme}</h3>
                        </div>
                        {!isReadOnly && (roadmapStatus === 'active' || roadmapStatus === 'saved') ? (
                            <button 
                                onClick={() => onFeatureClick('week-assessment', { skill: skillName, theme: weekData.theme, weekIndex: index })}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                    weekData.completed 
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 cursor-default' 
                                    : (isTimeLocked 
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-green-500 hover:text-white hover:shadow-md'
                                    )
                                }`}
                                disabled={weekData.completed || isTimeLocked}
                            >
                                {weekData.completed ? (
                                    <>
                                        <ion-icon name="checkmark-done-outline" className="text-lg"></ion-icon>
                                        {weekData.score !== undefined ? `Score: ${weekData.score}/15` : 'Completed'}
                                    </>
                                ) : isTimeLocked ? (
                                    <>
                                        <ion-icon name="lock-closed-outline" className="text-lg"></ion-icon>
                                        Unlocks {unlockDate.toLocaleDateString()}
                                    </>
                                ) : (
                                    <>
                                        <ion-icon name="ellipse-outline" className="text-lg"></ion-icon>
                                        Mark Complete (Assignment)
                                    </>
                                )}
                            </button>
                        ) : null}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-fadeIn">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Weekly Goals:</h4>
                        <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300 text-sm">
                            {weekData.goals.map(goal => <li key={goal}>{goal}</li>)}
                        </ul>

                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2">AI Learning Tools:</h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            <AIToolCard icon="document-text-outline" label="ELI5" color="green" onClick={(e) => { e.stopPropagation(); onFeatureClick('eli5', { skill: skillName, theme: weekData.theme }) }}/>
                            <AIToolCard icon="bulb-outline" label="Quiz" color="amber" onClick={(e) => { e.stopPropagation(); onFeatureClick('quiz', { skill: skillName, theme: weekData.theme, weekIndex: index, startedAt: weekData.startedAt }) }}/>
                            <AIToolCard icon="albums-outline" label="Flashcards" color="indigo" onClick={(e) => { e.stopPropagation(); onFeatureClick('flashcards', { skill: skillName, theme: weekData.theme }) }}/>
                            <AIToolCard icon="construct-outline" label="Scenario" color="rose" onClick={(e) => { e.stopPropagation(); onFeatureClick('scenario', { skill: skillName, theme: weekData.theme }) }}/>
                            <AIToolCard icon="image-outline" label="Visualize" color="teal" onClick={(e) => { e.stopPropagation(); onFeatureClick('visualize', { skill: skillName, theme: weekData.theme }) }}/>
                            <AIToolCard icon="git-network-outline" label="Connections" color="cyan" onClick={(e) => { e.stopPropagation(); onFeatureClick('connections', { skill: skillName, theme: weekData.theme }) }}/>
                            <AIToolCard icon="chatbubbles-outline" label="Debate" color="purple" onClick={(e) => { e.stopPropagation(); onFeatureClick('debate', { skill: skillName, theme: weekData.theme }) }}/>
                            <AIToolCard icon="help-buoy-outline" label="I'm Stuck" color="orange" onClick={(e) => { e.stopPropagation(); onFeatureClick('stuck', { skill: skillName, theme: weekData.theme }) }}/>
                        </div>
                        
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2">Key Resources:</h4>
                        <div className="space-y-2">
                            {weekData.resources.map(res => <ResourceLink key={res.searchQuery} resource={res} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PlatformCard: React.FC<{platform: Platform, color: 'green' | 'purple' | 'orange'}> = ({ platform, color }) => {
    const colorClasses = {
        green: 'border-green-500 bg-green-50/50 dark:bg-green-900/20 hover:bg-green-50 dark:hover:bg-green-900/30',
        purple: 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 hover:bg-purple-50 dark:hover:bg-purple-900/30',
        orange: 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/20 hover:bg-orange-50 dark:hover:bg-orange-900/30',
    };

    return (
        <a 
            href={`https://google.com/search?q=${encodeURIComponent(platform.searchQuery)}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`block p-4 rounded-lg border border-l-4 transition-all ${colorClasses[color]}`}
        >
            <h4 className="font-bold text-slate-800 dark:text-slate-200">{platform.name}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{platform.description}</p>
        </a>
    );
};

const TimelineEventCard: React.FC<{ event: TimelineEvent }> = ({ event }) => (
    <div 
        className="block p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-700">{event.eventName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{event.description}</p>
            </div>
            <div className="text-right ml-2 flex-shrink-0">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded-full">{event.estimatedDate}</p>
            </div>
        </div>
    </div>
);


const Roadmap: React.FC<RoadmapProps> = ({ data, userProfile, onStartOver, onFeatureClick, setRoadmapData }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // States for prefetched insight data
    const [toughness, setToughness] = useState<Toughness | null>(null);
    const [jobTrend, setJobTrend] = useState<JobTrendData | null>(null);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[] | null>(null);
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);

    const isReadOnly = !data.id || data.status === undefined; // Basic check if it's a preview

    // Calculate Completion Percentage
    const completedWeeks = data.roadmap.filter(w => w.completed).length;
    const totalWeeks = data.roadmap.length;
    const percentage = Math.round((completedWeeks / totalWeeks) * 100);

    useEffect(() => {
        if (data && data.skill) {
            const fetchAllInsights = async () => {
                const results = await Promise.allSettled([
                    GeminiService.getToughness(data.skill),
                    GeminiService.getJobTrendData(data.skill),
                    GeminiService.getTimelineEvents(userProfile, data.skill),
                ]);

                if (results[0].status === 'fulfilled') setToughness(results[0].value);
                if (results[1].status === 'fulfilled') setJobTrend(results[1].value);
                if (results[2].status === 'fulfilled') setTimelineEvents(results[2].value);
            };

            const fetchNews = async () => {
                setLoadingNews(true);
                try {
                    const articles = await getEducationNews(data.skill);
                    setNews(articles);
                } catch (e) {
                    console.error("Failed to fetch news", e);
                } finally {
                    setLoadingNews(false);
                }
            };

            fetchAllInsights();
            fetchNews();
        }
    }, [data, userProfile]);

    const handleSaveRoadmap = async () => {
        setIsSaving(true);
        try {
            // If saving a shared/public roadmap, it becomes a new entry for this user
            const newId = await saveRoadmap(data.skill, data);
            setRoadmapData({ ...data, id: newId, status: 'saved', isPublic: false }); 
            alert("Roadmap saved successfully! You can find it in your dashboard.");
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleShare = async () => {
        if (!data.id) {
            // Auto save first if trying to share a new roadmap
            if (confirm("To share this roadmap, it must be saved first. Save now?")) {
                try {
                    setIsSaving(true);
                    const newId = await saveRoadmap(data.skill, data);
                    // Update local state immediately so we can share
                    const newData = { ...data, id: newId, status: 'saved' as const };
                    setRoadmapData(newData);
                    // Now allow share
                    await makeRoadmapPublic(newId);
                    onFeatureClick('share-roadmap', { roadmapId: newId, skill: data.skill });
                } catch(e: any) {
                    alert("Could not save: " + e.message);
                } finally {
                    setIsSaving(false);
                }
            }
            return;
        }

        try {
            await makeRoadmapPublic(data.id);
            onFeatureClick('share-roadmap', { roadmapId: data.id, skill: data.skill });
        } catch (e: any) {
            alert("Failed to generate share link: " + e.message);
        }
    };

    const handleStartWeek = (index: number) => {
        if (isReadOnly) return;
        const updatedWeeks = data.roadmap.map((week, i) => {
            const firstLockedIndex = data.roadmap.findIndex(w => !w.startedAt);
            if (i === index && index === firstLockedIndex) {
                return { ...week, startedAt: new Date().toISOString() };
            }
            return week;
        });
        const updatedRoadmap = { ...data, roadmap: updatedWeeks };
        setRoadmapData(updatedRoadmap);

        if (data.id) {
            updateRoadmap(updatedRoadmap);
        }
    };

    // Note: Completion logic is now handled in App.tsx via handleAssessmentPass
    const handleCompleteWeek = (index: number) => {
        // Triggered via onFeatureClick now
    };

    const allWeeksComplete = data.roadmap.every(w => w.completed);

    const handleFinishRoadmap = async () => {
        if (!allWeeksComplete || isReadOnly) return;
        if (!data.id) {
            alert("Please save the roadmap first to complete it.");
            return;
        }

        try {
            await markRoadmapComplete(data.id);
            const updatedRoadmap: RoadmapData = { ...data, status: 'completed', progress: 100 };
            setRoadmapData(updatedRoadmap);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000); // Hide after 5s
        } catch (e: any) {
            console.error("Error completing roadmap", e);
            alert("Failed to complete roadmap. Please try again.");
        }
    };

    // Helper to calculate lock status
    const getWeekLockStatus = (index: number) => {
        if (data.status !== 'active') return { isLocked: false, unlockDate: new Date() };
        
        // Strict timestamp logic: Week N unlocks at CreatedAt + (N * 7 days)
        // Week 1 (index 0) unlocks at T+0
        // Week 2 (index 1) unlocks at T+7 days
        const createdAt = data.created_at ? new Date(data.created_at) : new Date();
        const daysToUnlock = index * 7;
        const unlockDate = new Date(createdAt.getTime() + daysToUnlock * 24 * 60 * 60 * 1000);
        const now = new Date();
        
        return {
            isLocked: now < unlockDate,
            unlockDate
        };
    };

    return (
        <div className="animate-fadeIn max-w-7xl mx-auto relative">
             {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl text-center border-4 border-yellow-400 animate-bounce">
                        <div className="text-6xl mb-4">🏆</div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">CONGRATULATIONS!</h2>
                        <p className="text-lg text-slate-600 dark:text-slate-300">You've mastered this roadmap!</p>
                        <p className="text-2xl font-bold text-amber-500 mt-2">+100 XP Bonus Awarded</p>
                    </div>
                </div>
             )}
            
            <div className="text-center mb-6">
                <h2 className="roadmap-title-font text-4xl font-extrabold text-slate-900 dark:text-white">
                    {isReadOnly ? `Preview: Path to ${data.skill}` : `Your Path to Mastering ${data.skill}`}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mt-2">A {data.roadmap.length}-week learning journey.</p>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="mb-8 glass-card p-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Total Progress</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{percentage}%</span>
                </div>
                <progress className="roadmap-progress-bar" value={percentage} max={100} aria-label="Roadmap completion progress" />
            </div>

            <div className="glass-card p-5 mb-8">
                {toughness ? (
                    <div className="animate-fadeIn text-center">
                        <h3 className="font-bold text-lg mb-2">Toughness Level</h3>
                        <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">{toughness.toughness}/100</div>
                        <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm max-w-2xl mx-auto">{toughness.justification}</p>
                    </div>
                ) : <Loader message="Analyzing toughness..." />}
            </div>

            <div className="glass-card p-5 mb-8 text-center">
                <h3 className="font-bold text-lg mb-4">Next Degree Suggestion</h3>
                <button onClick={() => onFeatureClick('next-degree-suggestion', { skill: data.skill })} className="dynamic-button !py-2 !px-5">
                    Suggest Next Degree Program
                </button>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-start">
                {/* Left Column: Timeline */}
                <div className="lg:col-span-2">
                    {data.roadmap.map((week, index) => {
                        const { isLocked, unlockDate } = getWeekLockStatus(index);
                        return (
                            <RoadmapWeek 
                                key={week.week} 
                                weekData={week} 
                                skillName={data.skill} 
                                onFeatureClick={onFeatureClick} 
                                index={index}
                                onStartWeek={handleStartWeek}
                                onCompleteWeek={handleCompleteWeek}
                                roadmapStatus={data.status}
                                isLast={index === data.roadmap.length - 1}
                                isReadOnly={isReadOnly}
                                isTimeLocked={isLocked}
                                unlockDate={unlockDate}
                            />
                        );
                    })}
                    
                    {/* Finish Roadmap Button */}
                    {!isReadOnly && (
                        <div className="mt-8 text-center pb-8">
                            {data.status === 'completed' ? (
                                <div className="inline-block bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-800 dark:text-green-300 px-8 py-4 rounded-xl font-bold text-lg">
                                    <ion-icon name="trophy" className="text-xl mr-2 mb-1"></ion-icon>
                                    Roadmap Completed!
                                </div>
                            ) : (
                                <button 
                                    onClick={handleFinishRoadmap}
                                    disabled={!allWeeksComplete || !data.id}
                                    className={`dynamic-button w-full md:w-auto text-lg !py-4 !px-10 shadow-xl transition-all
                                        ${allWeeksComplete 
                                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 scale-105 animate-pulse-slow' 
                                            : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
                                        }
                                    `}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <ion-icon name="flag"></ion-icon>
                                        Mark Roadmap as Complete (+100 XP)
                                    </span>
                                </button>
                            )}
                            {!allWeeksComplete && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Complete all weekly assignments to unlock the final bonus.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Insights & Resources */}
                <div className="space-y-6">
                    <div className="glass-card p-5">
                        <h3 className="font-bold text-lg mb-3">Career Compass</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <AIToolCard icon="analytics-outline" label="Toughness" color="red" onClick={(e) => { e.stopPropagation(); onFeatureClick('toughness', { skill: data.skill }) }} />
                            <AIToolCard icon="location-outline" label="Offline Centers" color="green" onClick={(e) => { e.stopPropagation(); onFeatureClick('offline-centers', { skill: data.skill }) }} />
                            <AIToolCard icon="briefcase-outline" label="Career Paths" color="indigo" onClick={(e) => { e.stopPropagation(); onFeatureClick('career-paths', { skill: data.skill }) }} />
                            <AIToolCard icon="rocket-outline" label="Projects" color="purple" onClick={(e) => { e.stopPropagation(); onFeatureClick('projects', { skill: data.skill }) }}/>
                            <AIToolCard icon="book-outline" label="Deep Dive" color="sky" onClick={(e) => { e.stopPropagation(); onFeatureClick('deep-dive', { skill: data.skill }) }} />
                            <AIToolCard icon="build-outline" label="Setup Guide" color="gray" onClick={(e) => { e.stopPropagation(); onFeatureClick('setup-guide', { skill: data.skill }) }} />
                            <AIToolCard icon="star-outline" label="Recommend Career" color="amber" onClick={(e) => { e.stopPropagation(); onFeatureClick('career-recommender', { skill: data.skill }) }} />
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                             <ion-icon name="newspaper-outline"></ion-icon> Latest Education News
                        </h3>
                        {loadingNews ? (
                             <div className="text-center py-4 text-slate-500 text-sm">Loading updates...</div>
                        ) : news.length > 0 ? (
                            <div>
                                {news.map(article => <NewsCard key={article.article_id} article={article} />)}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm italic">No recent news found for this topic.</p>
                        )}
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="font-bold text-lg mb-3">Job Market Pulse</h3>
                        {jobTrend ? <JobTrendChart trendData={jobTrend} skillName={data.skill} /> : <Loader message="Analyzing job trends..." />}
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="font-bold text-lg mb-3">Academic Timeline</h3>
                        {timelineEvents ? (
                            <div className="space-y-3">
                                {timelineEvents.slice(0, 2).map(event => <TimelineEventCard key={event.eventName} event={event} />)}
                                {timelineEvents.length > 2 && (
                                    <div className="text-center mt-4">
                                        <button 
                                            onClick={() => onFeatureClick('timeline', { skill: data.skill })} 
                                            className="dynamic-button bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 shadow-sm hover:shadow-md !py-1 !px-4 text-sm"
                                        >
                                            More Info
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : <Loader message="Generating timeline..." />}
                    </div>
                    
                    <div className="glass-card p-5">
                        <h3 className="font-bold text-lg mb-3 text-green-700 dark:text-green-400">Learning Platforms (Free)</h3>
                        <div className="space-y-3">
                            {data.freePlatforms.map(p => <PlatformCard key={p.name} platform={p} color="green" />)}
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="font-bold text-lg mb-3 text-purple-700 dark:text-purple-400">Learning Platforms (Paid)</h3>
                        <div className="space-y-3">
                            {data.paidPlatforms.map(p => <PlatformCard key={p.name} platform={p} color="purple" />)}
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="font-bold text-lg mb-3 text-orange-700 dark:text-orange-400">Recommended Books</h3>
                        <div className="space-y-3">
                            {data.books.map(p => <PlatformCard key={p.name} platform={p} color="orange" />)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center border-t border-slate-200 dark:border-slate-700 pt-8 flex flex-col md:flex-row justify-center items-center gap-4">
                
                {/* Save / Import Button */}
                <button onClick={handleSaveRoadmap} disabled={isSaving || (!!data.id && !isReadOnly)} className="dynamic-button !py-3 !px-8 text-base flex items-center gap-2">
                    {isSaving ? 'Processing...' : (isReadOnly ? (
                        <>
                            <ion-icon name="download-outline"></ion-icon> Import to My Dashboard
                        </>
                    ) : (
                        'Save This Path'
                    ))}
                </button>

                {/* Share Button (Only if saved) */}
                {data.id && !isReadOnly && (
                    <button onClick={handleShare} className="dynamic-button bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200 !py-3 !px-8 text-base flex items-center gap-2">
                        <ion-icon name="share-social-outline"></ion-icon> Share
                    </button>
                )}

                <button onClick={onStartOver} className="dynamic-button bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 shadow-sm hover:shadow-md !py-3 !px-8 text-base">
                    Start a New Path
                </button>
            </div>
        </div>
    );
};

export default Roadmap;
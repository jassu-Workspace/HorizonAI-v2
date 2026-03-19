import React, { useState } from 'react';
import { signOut } from '../services/supabaseService';

interface HeaderProps {
    language: string;
    onLanguageChange: (lang: string) => void;
    title: string;
    subtitle: string;
    onToggleAnimation: () => void;
    currentAnimation: 'net' | 'globe';
    onResumeSession: () => void;
    hasSavedSession: boolean;
    onShowDashboard: () => void;
    showDashboardButton: boolean;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    onToggleEmojis?: () => void; // New prop
    showEmojis?: boolean; // New prop
}

const Header: React.FC<HeaderProps> = ({ 
    language, onLanguageChange, title, subtitle, 
    onToggleAnimation, currentAnimation, onResumeSession, 
    hasSavedSession, onShowDashboard, showDashboardButton, 
    theme, toggleTheme, onToggleEmojis, showEmojis 
}) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const languages = ['English', 'हिन्दी', 'தமிழ்', 'Español', 'Français'];

    const handleSignOut = async () => {
        await signOut();
        window.location.reload(); // Reload to reset state to Auth screen
    };

    return (
        <header className="p-3 sm:p-6 mb-4 sm:mb-8 relative z-10">
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {showDashboardButton && (
                            <button onClick={onShowDashboard} className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs sm:text-sm flex items-center gap-1 border border-slate-200 dark:border-slate-600 rounded-full px-2.5 sm:px-3 py-1 bg-white/80 dark:bg-slate-800/80 font-medium shadow-sm">
                                <ion-icon name="grid-outline"></ion-icon> My Dashboard
                            </button>
                        )}
                        <button onClick={handleSignOut} className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors text-xs sm:text-sm flex items-center gap-1 border border-slate-200 dark:border-slate-600 rounded-full px-2.5 sm:px-3 py-1 bg-white/50 dark:bg-slate-800/50">
                            <ion-icon name="log-out-outline"></ion-icon> Sign Out
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                 {/* Focus Mode Toggle (Emojis) */}
                 {onToggleEmojis && (
                    <button 
                        onClick={onToggleEmojis}
                        className={`flex items-center justify-center w-10 h-10 text-lg font-medium border rounded-lg shadow-sm transition-colors ${showEmojis ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-white/50 text-slate-400 border-slate-300'}`}
                        title={showEmojis ? "Enable Focus Mode (Hide Emojis)" : "Disable Focus Mode (Show Emojis)"}
                    >
                        <ion-icon name={showEmojis ? "eye-outline" : "eye-off-outline"}></ion-icon>
                    </button>
                 )}

                 <button 
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-10 h-10 text-lg font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                >
                    <ion-icon name={theme === 'light' ? 'moon-outline' : 'sunny-outline'}></ion-icon>
                </button>
                 <button 
                    onClick={onToggleAnimation}
                    className="flex items-center justify-center w-10 h-10 text-lg font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title={`Switch to ${currentAnimation === 'net' ? 'Globe' : 'Net'} background`}
                >
                    <ion-icon name={currentAnimation === 'net' ? 'globe-outline' : 'grid-outline'}></ion-icon>
                </button>
                <div className="relative">
                    <button 
                        onClick={() => setDropdownOpen(prev => !prev)}
                        className="flex items-center gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors h-10"
                    >
                        <ion-icon name="language-outline"></ion-icon>
                        <span className="max-w-[88px] sm:max-w-none truncate">{language}</span>
                        <ion-icon name="chevron-down-outline" className={`text-xs transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}></ion-icon>
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl z-20 py-1 border border-slate-200 dark:border-slate-700" onMouseLeave={() => setDropdownOpen(false)}>
                            {languages.map(lang => (
                                <a 
                                    href="#" 
                                    key={lang} 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onLanguageChange(lang);
                                        setDropdownOpen(false);
                                    }} 
                                    className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    {lang}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
                    </div>
                </div>

                <div className="text-center px-1">
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight break-words" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {title}
                    </h1>
                    <p className="mt-2 sm:mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                        {subtitle}
                    </p>
                </div>
            </div>
        </header>
    );
};

export default Header;
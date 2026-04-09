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
        <header className="relative z-10 px-3 py-3 sm:px-6 sm:py-6 mb-4 sm:mb-8">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col gap-4 sm:gap-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                            {showDashboardButton && (
                                <button
                                    onClick={onShowDashboard}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/65 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white/85 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700/85"
                                >
                                    <ion-icon name="grid-outline"></ion-icon>
                                    My Dashboard
                                </button>
                            )}
                            <button
                                onClick={handleSignOut}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/55 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 shadow-sm backdrop-blur-md transition-colors hover:bg-white/80 hover:text-red-600 dark:border-slate-700/70 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-red-300"
                            >
                                <ion-icon name="log-out-outline"></ion-icon>
                                Sign Out
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
                            {onToggleEmojis && (
                                <button
                                    onClick={onToggleEmojis}
                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-sm backdrop-blur-md transition-colors ${showEmojis ? 'border-blue-200 bg-blue-100/90 text-blue-600 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-300' : 'border-slate-200/70 bg-white/60 text-slate-400 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-500'}`}
                                    title={showEmojis ? 'Enable Focus Mode (Hide Emojis)' : 'Disable Focus Mode (Show Emojis)'}
                                >
                                    <ion-icon name={showEmojis ? 'eye-outline' : 'eye-off-outline'}></ion-icon>
                                </button>
                            )}

                            <button
                                onClick={toggleTheme}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/60 text-lg text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white/85 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700/85"
                                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                            >
                                <ion-icon name={theme === 'light' ? 'moon-outline' : 'sunny-outline'}></ion-icon>
                            </button>

                            <button
                                onClick={onToggleAnimation}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/60 text-lg text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white/85 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700/85"
                                title={`Switch to ${currentAnimation === 'net' ? 'Globe' : 'Net'} background`}
                            >
                                <ion-icon name={currentAnimation === 'net' ? 'globe-outline' : 'grid-outline'}></ion-icon>
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(prev => !prev)}
                                    className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white/60 px-3 text-xs sm:text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white/85 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700/85"
                                >
                                    <ion-icon name="language-outline"></ion-icon>
                                    <span className="max-w-[88px] truncate">{language}</span>
                                    <ion-icon name="chevron-down-outline" className={`text-xs transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}></ion-icon>
                                </button>

                                {isDropdownOpen && (
                                    <div
                                        className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 py-1 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95"
                                        onMouseLeave={() => setDropdownOpen(false)}
                                    >
                                        {languages.map(lang => (
                                            <button
                                                type="button"
                                                key={lang}
                                                onClick={() => {
                                                    onLanguageChange(lang);
                                                    setDropdownOpen(false);
                                                }}
                                                className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-center px-1 sm:px-6">
                        <h1 className="font-space-grotesk text-4xl font-bold leading-tight text-slate-900 break-words sm:text-5xl md:text-6xl dark:text-white">
                            {title}
                        </h1>
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:mt-4 sm:text-lg dark:text-slate-300">
                            {subtitle}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
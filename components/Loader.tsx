import React, { useState, useEffect } from 'react';

interface LoaderProps {
    message: string;
    subMessages?: string[];
}

const DEFAULT_ROADMAP_MESSAGES = [
    'Analyzing your profile...',
    'Curating skill suggestions...',
    'Building your personalized path...',
    'Finalizing resources...',
    'Almost there...',
];

export const Loader: React.FC<LoaderProps> = ({ message, subMessages }) => {
    const [subIndex, setSubIndex] = useState(0);
    const [dots, setDots] = useState('');
    const messages = subMessages || DEFAULT_ROADMAP_MESSAGES;

    // Cycle through sub-messages every 4 seconds
    useEffect(() => {
        if (messages.length <= 1) return;
        const interval = setInterval(() => {
            setSubIndex(prev => (prev + 1) % messages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [messages.length]);

    // Animated ellipsis
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const cubeStyle: React.CSSProperties = {
        width: '50px',
        height: '50px',
        transformStyle: 'preserve-3d',
        animation: 'cube-rotate 4s infinite linear',
        position: 'relative',
    };

    const faceStyle: React.CSSProperties = {
        position: 'absolute',
        width: '50px',
        height: '50px',
        border: '2px solid var(--primary-color)',
        background: 'rgba(59, 130, 246, 0.2)',
        boxShadow: '0 0 15px var(--primary-glow)',
    };

    return (
        <div
            className="text-center p-8 flex flex-col justify-center items-center min-h-[70vh]"
            role="status"
            aria-live="polite"
            aria-label={message}
        >
            <div style={{ perspective: '1200px' }}>
                <div style={cubeStyle}>
                    <div style={{ ...faceStyle, transform: 'translateZ(25px)' }}></div>
                    <div style={{ ...faceStyle, transform: 'rotateY(90deg) translateZ(25px)' }}></div>
                    <div style={{ ...faceStyle, transform: 'rotateY(180deg) translateZ(25px)' }}></div>
                    <div style={{ ...faceStyle, transform: 'rotateY(-90deg) translateZ(25px)' }}></div>
                    <div style={{ ...faceStyle, transform: 'rotateX(90deg) translateZ(25px)' }}></div>
                    <div style={{ ...faceStyle, transform: 'rotateX(-90deg) translateZ(25px)' }}></div>
                </div>
            </div>

            {message && (
                <p className="mt-8 text-slate-700 dark:text-slate-300 font-semibold text-lg">
                    {message}<span className="inline-block w-6 text-left">{dots}</span>
                </p>
            )}

            {messages.length > 0 && (
                <p
                    key={subIndex}
                    className="mt-2 text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto transition-opacity duration-700"
                    aria-live="off"
                >
                    {messages[subIndex]}
                </p>
            )}

            <div className="mt-6 flex gap-1.5 justify-center" aria-hidden="true">
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-blue-500/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    );
};
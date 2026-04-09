import React, { useEffect, useMemo, useState } from 'react';
import { Stream } from '../types';

interface BackgroundEmojisProps {
    stream: Stream;
    branch?: string;
    show: boolean;
}

const EMOJI_MAP: Record<string, string[]> = {
    // --- Arts & Commerce ---
    'Bachelor of Fine Arts': ['🎨', '🖌️', '🖼️', '🎭', '✏️', '📐', '🖍️', '🗿'],
    'B.Ed': ['📚', '👩‍🏫', '🏫', '📝', '🧠', '👶', '🗣️', '📖'],
    'MA-Hindi': ['🕉️', '📜', '✍️', '📖', '🗣️', '🇮🇳', '🎭', '✒️'],
    'M.A. Dance': ['💃', '🕺', '🩰', '🎶', '🎭', '👯', '🦶', '🎵'],
    'M.A-Music': ['🎵', '🎼', '🎤', '🎹', '🎸', '🎻', '🥁', '🎧'],
    'M.A-Yoga & Consciousness': ['🧘', '🕉️', '🌿', '🧠', '🦴', '🍎', '🌅', '🤸'],
    'MA-Sanskrit': ['📜', '🕉️', '🏛️', '✍️', '📖', '🧘', '🕌', '🗣️'],

    // --- Engineering (Graduation) ---
    'Architecture': ['🏛️', '🏗️', '📐', '🏠', '🌉', '🏙️', '🧱', '✏️'],
    'Civil': ['🏗️', '🌉', '🚧', '📐', '🛣️', '🧱', '👷', '🏘️'],
    'CSE': ['💻', '⌨️', '💾', '🌐', '👾', '🤖', '🔐', '☁️'],
    'ECE': ['🔌', '📡', '💡', '📻', '📟', '⚡', '🔋', '🔬'],
    'IT': ['🖥️', '☁️', '📊', '🔐', '📡', '💾', '📱', '📶'],
    'Mech': ['⚙️', '🔧', '🚗', '🏭', '🛠️', '🦾', '🏎️', '🚂'],

    // --- Engineering (PG) ---
    'Geo Technical Engineering': ['🌍', '🪨', '⛏️', '🏗️', '🌋', '⛰️', '🧪', '🔬'],
    'Computer Science & Technology': ['💻', '🧠', '🔐', '📊', '🤖', '☁️', '📡', '📱'],
    'Heat Power Engineering': ['🔥', '❄️', '⚡', '🏭', '☀️', '🌡️', '💨', '🔋'],

    // --- Science & Technology ---
    'Biochemistry': ['🧬', '🧪', '🔬', '💊', '🦠', '🩸', '🍏', '🐁'],
    'Microbiology': ['🦠', '🔬', '🧫', '🍄', '🧬', '🧪', '🩸', '😷'],
    'Environmental Sciences': ['🌍', '🌱', '♻️', '☀️', '🌊', '🌳', '🗑️', '🐾'],
    'Mathematics': ['➕', '➖', '➗', '✖️', '📐', '📉', '♾️', '🔢'],

    // --- Medical ---
    'Anatomy': ['💀', '🦴', '🧠', '🦷', '👁️', '👂', '🦵', '🦶'],
    'Cardiology': ['❤️', '🩺', '🩸', '🏥', '💓', '📉', '⚕️', '🚑'],
    'Dentist': ['🦷', '🪥', '😷', '💉', '🏥', '🪞', '👄', '🍬'],
    'Neuro Surgery': ['🧠', '🔪', '🏥', '🔬', '🦴', '💊', '⚡', '🤕'],
    'Forensic': ['🕵️', '🔬', '🧬', '🩸', '🚓', '📸', '🧤', '💀'],

    // --- Diploma ---
    'Computer Science': ['💻', '⌨️', '💾', '🌐', '👾', '🤖', '🔐', '☁️'],
    'Mechanical': ['⚙️', '🔧', '🚗', '🏭', '🛠️', '🦾', '🏎️', '🚂'],
    'Electrical': ['💡', '🔌', '⚡', '🔋', '💡', '🔌', '⚡', '🔋'],

    // --- Broad Streams (Fallbacks) ---
    'Arts': ['🎨', '🎭', '🖌️', '📷', '✍️', '🎬', '🗿', '🎼'],
    'Commerce': ['📊', '💰', '📉', '💼', '🏦', '💹', '💳', '🧾'],
    'Science': ['🧪', '🔬', '🔭', '🧫', '⚛️', '🌱', '🌍', '🧬'],
    'Biology': ['🧬', '🦠', '🌿', '🐸', '💊', '🩸', '🦴', '🔬'],
    'General': ['📚', '✏️', '🎓', '📝', '🧠', '💡', '🎯', '🚀']
};

const BackgroundEmojis: React.FC<BackgroundEmojisProps> = ({ stream, branch, show }) => {
    const [emojis, setEmojis] = useState<string[]>([]);
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    
    useEffect(() => {
        // Determine which set of emojis to use based on Branch first, then Stream, then General
        let selectedEmojis = EMOJI_MAP['General'];

        if (branch && EMOJI_MAP[branch]) {
            selectedEmojis = EMOJI_MAP[branch];
        } else if (stream) {
            // Map stream to broad categories if exact match not found
            if (stream.includes('Engineering')) selectedEmojis = EMOJI_MAP['CSE']; // Default eng
            else if (stream.includes('Medical') || stream === 'Biology') selectedEmojis = EMOJI_MAP['Medical'];
            else if (stream.includes('Arts')) selectedEmojis = EMOJI_MAP['Arts'];
            else if (stream.includes('Commerce')) selectedEmojis = EMOJI_MAP['Commerce'];
            else if (stream.includes('Science')) selectedEmojis = EMOJI_MAP['Science'];
        }

        setEmojis(selectedEmojis);
    }, [stream, branch]);

    if (!show) return null;

    const floatingLayer = useMemo(() => {
        if (!emojis.length) {
            return { items: [], styles: '' };
        }

        const count = isMobile ? 10 : 20;
        const items = Array.from({ length: count }).map((_, i) => {
            const emoji = emojis[i % emojis.length];
            const left = `${Math.random() * 100}%`;
            const top = `${Math.random() * 100}%`;
            const animationDuration = `${5 + Math.random() * 10}s`;
            const delay = `${Math.random() * 5}s`;
            const size = `${2 + Math.random() * 3}rem`;
            const className = `emoji-float-${i}`;

            return {
                emoji,
                className,
                styleRule: `.${className} { left: ${left}; top: ${top}; font-size: ${size}; animation-duration: ${animationDuration}; animation-delay: ${delay}; color: #1a1a1a; text-shadow: 0 0 5px rgba(0,0,0,0.2); }`
            };
        });

        return {
            items,
            styles: items.map((item) => item.styleRule).join('\n')
        };
    }, [emojis, isMobile]);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
                    50% { transform: translateY(-40px) rotate(20deg); opacity: 0.6; }
                    100% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
                }
                ${floatingLayer.styles}
            `}</style>
            {floatingLayer.items.map((item) => (
                <div
                    key={item.className}
                    className={`fixed select-none pointer-events-none z-0 animate-float opacity-60 grayscale filter contrast-125 ${item.className}`}
                >
                    {item.emoji}
                </div>
            ))}
        </div>
    );
};

export default BackgroundEmojis;
import React, { useEffect, useRef } from 'react';

interface BackgroundAnimationProps {
    animationType: 'net' | 'globe';
}

const NET_NODES = [
    { id: 'n1', x: 150, y: 140 },
    { id: 'n2', x: 330, y: 110 },
    { id: 'n3', x: 560, y: 150 },
    { id: 'n4', x: 790, y: 120 },
    { id: 'n5', x: 980, y: 170 },
    { id: 'n6', x: 190, y: 300 },
    { id: 'n7', x: 410, y: 270 },
    { id: 'n8', x: 610, y: 310 },
    { id: 'n9', x: 840, y: 260 },
    { id: 'n10', x: 1040, y: 320 },
    { id: 'n11', x: 130, y: 520 },
    { id: 'n12', x: 350, y: 470 },
    { id: 'n13', x: 580, y: 520 },
    { id: 'n14', x: 790, y: 480 },
    { id: 'n15', x: 1000, y: 540 },
];

const NET_LINKS: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [5, 6], [6, 7], [7, 8], [8, 9],
    [10, 11], [11, 12], [12, 13], [13, 14],
    [0, 5], [1, 6], [2, 7], [3, 8], [4, 9],
    [5, 10], [6, 11], [7, 12], [8, 13], [9, 14],
    [0, 6], [1, 7], [2, 8], [3, 9],
    [6, 12], [7, 13], [8, 14],
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const BackgroundAnimation: React.FC<BackgroundAnimationProps> = ({ animationType }) => {
    const shellRef = useRef<HTMLDivElement | null>(null);
    const currentCursorRef = useRef({ x: 0, y: 0 });
    const targetCursorRef = useRef({ x: 0, y: 0 });
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const shell = shellRef.current;

        if (!shell) {
            return;
        }

        const applyCursorPosition = () => {
            frameRef.current = null;

            const current = currentCursorRef.current;
            const target = targetCursorRef.current;

            current.x += (target.x - current.x) * 0.12;
            current.y += (target.y - current.y) * 0.12;

            shell.style.setProperty('--cursor-x', current.x.toFixed(3));
            shell.style.setProperty('--cursor-y', current.y.toFixed(3));

            const isSettled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;

            if (!isSettled) {
                frameRef.current = window.requestAnimationFrame(applyCursorPosition);
            }
        };

        const scheduleCursorUpdate = () => {
            if (frameRef.current === null) {
                frameRef.current = window.requestAnimationFrame(applyCursorPosition);
            }
        };

        const updateTargetFromPointer = (clientX: number, clientY: number) => {
            const width = window.innerWidth || 1;
            const height = window.innerHeight || 1;

            targetCursorRef.current = {
                x: clamp((clientX / width - 0.5) * 2, -1, 1),
                y: clamp((clientY / height - 0.5) * 2, -1, 1),
            };

            scheduleCursorUpdate();
        };

        const handlePointerMove = (event: PointerEvent) => {
            updateTargetFromPointer(event.clientX, event.clientY);
        };

        shell.style.setProperty('--cursor-x', '0');
        shell.style.setProperty('--cursor-y', '0');

        window.addEventListener('pointermove', handlePointerMove, { passive: true });

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);

            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    return (
        <div id="background-animation" ref={shellRef} className="background-shell" aria-hidden="true">
            <div className="background-shell-aurora background-shell-aurora-one" />
            <div className="background-shell-aurora background-shell-aurora-two" />

            {animationType === 'net' ? (
                <svg className="background-scene background-scene-net" viewBox="0 0 1200 800" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="net-line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.55" />
                        </linearGradient>
                        <radialGradient id="net-node-gradient" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#dbeafe" stopOpacity="1" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
                        </radialGradient>
                    </defs>

                    <g className="background-scene-drift">
                        {NET_LINKS.map(([startIndex, endIndex], index) => {
                            const start = NET_NODES[startIndex];
                            const end = NET_NODES[endIndex];
                            return (
                                <line
                                    key={`${start.id}-${end.id}-${index}`}
                                    x1={start.x}
                                    y1={start.y}
                                    x2={end.x}
                                    y2={end.y}
                                    stroke="url(#net-line-gradient)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                            );
                        })}

                        {NET_NODES.map((node, index) => (
                            <g key={node.id}>
                                <circle cx={node.x} cy={node.y} r={11} fill="#dbeafe" fillOpacity="0.12" />
                                <circle cx={node.x} cy={node.y} r={5.5} fill="url(#net-node-gradient)" className="background-node-pulse" />
                                <circle cx={node.x} cy={node.y} r={2.2} fill="#eff6ff" />
                            </g>
                        ))}
                    </g>
                </svg>
            ) : (
                <svg className="background-scene background-scene-globe" viewBox="0 0 1200 800" preserveAspectRatio="none">
                    <defs>
                        <radialGradient id="globe-core-gradient" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#eff6ff" stopOpacity="0.95" />
                            <stop offset="65%" stopColor="#bfdbfe" stopOpacity="0.26" />
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.02" />
                        </radialGradient>
                        <linearGradient id="globe-line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.45" />
                        </linearGradient>
                    </defs>

                    <g className="background-scene-drift">
                        <g transform="translate(600 390)">
                            <circle r="220" fill="url(#globe-core-gradient)" />
                            <circle r="220" fill="none" stroke="url(#globe-line-gradient)" strokeWidth="2" />

                            <g className="background-globe-spin-slow">
                                <ellipse rx="220" ry="78" fill="none" stroke="url(#globe-line-gradient)" strokeWidth="1.4" opacity="0.8" />
                                <ellipse rx="220" ry="132" fill="none" stroke="url(#globe-line-gradient)" strokeWidth="1.2" opacity="0.55" />
                                <ellipse rx="112" ry="220" fill="none" stroke="url(#globe-line-gradient)" strokeWidth="1.2" opacity="0.5" transform="rotate(22)" />
                                <ellipse rx="112" ry="220" fill="none" stroke="url(#globe-line-gradient)" strokeWidth="1.2" opacity="0.5" transform="rotate(-22)" />
                                <ellipse rx="156" ry="220" fill="none" stroke="url(#globe-line-gradient)" strokeWidth="1.2" opacity="0.4" transform="rotate(52)" />
                            </g>

                            <g className="background-globe-spin">
                                <circle cx="0" cy="-220" r="5" fill="#dbeafe" />
                                <circle cx="156" cy="-156" r="4.5" fill="#bfdbfe" />
                                <circle cx="220" cy="0" r="5" fill="#93c5fd" />
                                <circle cx="156" cy="156" r="4.5" fill="#bfdbfe" />
                                <circle cx="0" cy="220" r="5" fill="#dbeafe" />
                                <circle cx="-156" cy="156" r="4.5" fill="#bfdbfe" />
                                <circle cx="-220" cy="0" r="5" fill="#93c5fd" />
                                <circle cx="-156" cy="-156" r="4.5" fill="#bfdbfe" />
                            </g>
                        </g>
                    </g>
                </svg>
            )}
        </div>
    );
};

export default BackgroundAnimation;
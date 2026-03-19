import React from 'react';
import { motion } from 'framer-motion';

interface LandingPageProps {
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    onGetStarted: () => void;
    onExploreRoadmaps: () => void;
    onGoToAuth: () => void;
}

type Feature = {
    icon: string;
    title: string;
    description: string;
};

type RoleCard = {
    icon: string;
    title: string;
    description: string;
    color: string;
};

type Tool = {
    icon: string;
    title: string;
    description: string;
};

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
};

const features: Feature[] = [
    { icon: 'sparkles-outline', title: 'AI Skill Suggestions', description: 'Discover high-impact skills tailored to your interests, stream, and goals.' },
    { icon: 'speedometer-outline', title: 'Rapid Skill Assessment', description: 'Quickly evaluate your current level and unlock the right learning path.' },
    { icon: 'map-outline', title: 'Personalized Roadmaps', description: 'Get week-by-week roadmaps with goals, resources, and practical milestones.' },
    { icon: 'analytics-outline', title: 'Weekly Progress Tracking', description: 'Measure growth, complete checkpoints, and keep momentum every week.' },
    { icon: 'chatbubbles-outline', title: 'AI Coach Chat', description: 'Ask doubts, get guided explanations, and stay motivated while learning.' },
    { icon: 'document-text-outline', title: 'Resume Analysis', description: 'Improve your resume with role-aligned AI feedback and actionable upgrades.' },
];

const steps = [
    { icon: 'compass-outline', title: 'Choose your goal', description: 'Pick your skill direction and career intent.' },
    { icon: 'checkbox-outline', title: 'Take assessment', description: 'Get your level with a focused rapid test.' },
    { icon: 'git-branch-outline', title: 'Get roadmap', description: 'Receive a personalized week-by-week plan.' },
    { icon: 'trending-up-outline', title: 'Track & grow', description: 'Complete weekly tasks and level up with AI support.' },
];

const roles: RoleCard[] = [
    { icon: 'school-outline', title: 'Learner', description: 'Discover skills, build roadmaps, complete tasks, and stay interview-ready.', color: 'from-blue-500/20 to-cyan-400/20' },
    { icon: 'people-outline', title: 'Trainer', description: 'Monitor cohorts, evaluate progress signals, and guide learners effectively.', color: 'from-emerald-500/20 to-teal-400/20' },
    { icon: 'bar-chart-outline', title: 'Policymaker', description: 'View macro trends and identify where interventions can create impact.', color: 'from-amber-500/20 to-orange-400/20' },
];

const tools: Tool[] = [
    { icon: 'help-circle-outline', title: 'Quiz Generator', description: 'Generate topic-wise quizzes to validate learning quickly.' },
    { icon: 'albums-outline', title: 'Flashcards', description: 'Reinforce retention with concise memory-friendly cards.' },
    { icon: 'briefcase-outline', title: 'Mock Interviews', description: 'Practice with realistic role-based interview simulations.' },
    { icon: 'layers-outline', title: 'Deep Dive Explanations', description: 'Break down complex concepts into practical understanding.' },
];

const testimonials = [
    {
        quote: 'Horizon AI gave me a clear roadmap in minutes. I finally knew what to learn next and why.',
        name: 'Aarav M.',
        role: 'Engineering Student',
    },
    {
        quote: 'The weekly structure and AI coaching helped me stay consistent. My progress became measurable.',
        name: 'Priya S.',
        role: 'Career Transition Learner',
    },
    {
        quote: 'Role-wise visibility and roadmap insights made mentoring much more targeted for our learners.',
        name: 'Rohan K.',
        role: 'Trainer',
    },
];

const SectionHeader: React.FC<{ eyebrow: string; title: string; subtitle: string }> = ({ eyebrow, title, subtitle }) => (
    <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp}
        transition={{ duration: 0.45 }}
        className="text-center max-w-3xl mx-auto"
    >
        <p className="text-xs tracking-[0.2em] uppercase font-bold text-blue-600 dark:text-blue-400 mb-3">{eyebrow}</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">{subtitle}</p>
    </motion.div>
);

const LandingPage: React.FC<LandingPageProps> = ({ theme, onToggleTheme, onGetStarted, onExploreRoadmaps, onGoToAuth }) => {
    return (
        <div className="relative">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl"></div>
                <div className="absolute top-[20%] right-0 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl"></div>
            </div>

            <div className="relative z-10">
                <nav className="sticky top-3 z-20 px-2 sm:px-0">
                    <div className="max-w-6xl mx-auto glass-card rounded-2xl px-3 sm:px-5 py-3 flex items-center justify-between border border-white/40 dark:border-slate-700/60">
                        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 text-slate-900 dark:text-white font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white">
                                <ion-icon name="sparkles-outline"></ion-icon>
                            </span>
                            Horizon AI
                        </button>
                        <div className="hidden md:flex items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
                            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
                            <a href="#roles" className="hover:text-blue-600 transition-colors">Roles</a>
                            <a href="#tools" className="hover:text-blue-600 transition-colors">AI Tools</a>
                            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onToggleTheme}
                                className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                            >
                                <ion-icon name={theme === 'light' ? 'moon-outline' : 'sunny-outline'}></ion-icon>
                            </button>
                            <button onClick={onGoToAuth} className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                Sign In
                            </button>
                        </div>
                    </div>
                </nav>

                <section className="max-w-6xl mx-auto pt-14 sm:pt-20 pb-16 px-3 sm:px-4">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        transition={{ duration: 0.6 }}
                        className="glass-card rounded-[2rem] p-6 sm:p-10 lg:p-14 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/10"></div>
                        <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-center">
                            <div>
                                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                                    <ion-icon name="hardware-chip-outline"></ion-icon>
                                    AI Powered Platform
                                </p>
                                <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                    Your AI-Powered Learning & Career Navigator
                                </h1>
                                <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl">
                                    Personalized roadmaps, skill assessments, and AI coaching - all in one platform.
                                </p>
                                <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                                    <button onClick={onGetStarted} className="dynamic-button w-full sm:w-auto">Get Started</button>
                                    <button onClick={onExploreRoadmaps} className="w-full sm:w-auto px-6 py-3 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                        Explore Roadmaps
                                    </button>
                                </div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 0.65, delay: 0.2 }}
                                className="rounded-3xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 p-5 shadow-xl backdrop-blur"
                            >
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-700/80">
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Roadmap</p>
                                        <p className="font-bold text-slate-900 dark:text-white">Data Science Journey</p>
                                    </div>
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">72% Progress</span>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {[88, 65, 74, 50].map((value, index) => (
                                        <div key={index}>
                                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                <span>Week {index + 1}</span>
                                                <span>{value}%</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${value}%` }}
                                                    viewport={{ once: true }}
                                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                                                ></motion.div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl p-3 bg-slate-100/80 dark:bg-slate-800/80">
                                        <p className="text-xs text-slate-500">AI Quiz Score</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white">14/15</p>
                                    </div>
                                    <div className="rounded-2xl p-3 bg-slate-100/80 dark:bg-slate-800/80">
                                        <p className="text-xs text-slate-500">Coach Sessions</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white">26</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </section>

                <section id="features" className="max-w-6xl mx-auto px-3 sm:px-4 py-16 scroll-mt-20">
                    <SectionHeader eyebrow="Core Features" title="Everything You Need To Learn Smarter" subtitle="Designed for modern learners with AI-first assistance and structured growth." />
                    <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.2 }}
                                variants={fadeUp}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                className="glass-card rounded-2xl p-5 border border-white/40 dark:border-slate-700/60 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
                            >
                                <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">
                                    <ion-icon name={feature.icon}></ion-icon>
                                </div>
                                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="max-w-6xl mx-auto px-3 sm:px-4 py-16">
                    <SectionHeader eyebrow="How It Works" title="Simple Flow, Powerful Outcomes" subtitle="Go from uncertainty to a clear action plan in four guided steps." />
                    <div className="mt-12 grid md:grid-cols-4 gap-5 md:gap-0">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.title}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.3 }}
                                variants={fadeUp}
                                transition={{ duration: 0.4, delay: index * 0.08 }}
                                className="relative px-2"
                            >
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-8 left-[58%] w-[84%] h-px bg-gradient-to-r from-blue-500/60 to-cyan-400/10"></div>
                                )}
                                <div className="glass-card rounded-2xl p-5 h-full border border-white/40 dark:border-slate-700/60">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white flex items-center justify-center font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="mt-3 text-blue-600 dark:text-blue-400 text-xl">
                                        <ion-icon name={step.icon}></ion-icon>
                                    </div>
                                    <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{step.title}</h3>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section id="roles" className="max-w-6xl mx-auto px-3 sm:px-4 py-16 scroll-mt-20">
                    <SectionHeader eyebrow="Role-Based Experience" title="Built For Every Stakeholder" subtitle="One platform, three role-aware experiences for stronger learning outcomes." />
                    <div className="mt-10 grid md:grid-cols-3 gap-5">
                        {roles.map((role, index) => (
                            <motion.div
                                key={role.title}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.2 }}
                                variants={fadeUp}
                                transition={{ duration: 0.4, delay: index * 0.08 }}
                                className={`rounded-2xl p-[1px] bg-gradient-to-br ${role.color}`}
                            >
                                <div className="h-full glass-card rounded-2xl p-6 border border-white/40 dark:border-slate-700/60">
                                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xl">
                                        <ion-icon name={role.icon}></ion-icon>
                                    </div>
                                    <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{role.title}</h3>
                                    <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm">{role.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="max-w-6xl mx-auto px-3 sm:px-4 py-16">
                    <SectionHeader eyebrow="Demo Preview" title="A Dashboard Designed For Momentum" subtitle="Track progress, visualize trends, and stay accountable with actionable insights." />
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.15 }}
                        variants={fadeUp}
                        transition={{ duration: 0.45 }}
                        className="mt-10 glass-card rounded-3xl p-5 sm:p-7 border border-white/40 dark:border-slate-700/60"
                    >
                        <div className="grid lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 p-4">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Progress Analytics</p>
                                <div className="mt-4 grid grid-cols-6 gap-2 h-40 items-end">
                                    {[20, 45, 35, 62, 74, 88].map((h, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ height: 0 }}
                                            whileInView={{ height: `${h}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.55, delay: i * 0.05 }}
                                            className="rounded-t-xl bg-gradient-to-t from-blue-500 to-cyan-400"
                                        ></motion.div>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 p-4">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Roadmap Streak</p>
                                <div className="mt-4 space-y-3">
                                    {["AI Fundamentals", "Data Wrangling", "Model Building", "Portfolio Project"].map((item, idx) => (
                                        <div key={item} className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-300">{item}</span>
                                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{idx < 3 ? 'Done' : 'Next'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>

                <section id="tools" className="max-w-6xl mx-auto px-3 sm:px-4 py-16 scroll-mt-20">
                    <SectionHeader eyebrow="AI Toolkit" title="Powerful Learning Tools At Every Step" subtitle="Speed up understanding, retention, and interview readiness with built-in AI helpers." />
                    <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {tools.map((tool, index) => (
                            <motion.div
                                key={tool.title}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.2 }}
                                variants={fadeUp}
                                transition={{ duration: 0.4, delay: index * 0.06 }}
                                className="glass-card rounded-2xl p-5 border border-white/40 dark:border-slate-700/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="text-2xl text-blue-600 dark:text-blue-400">
                                    <ion-icon name={tool.icon}></ion-icon>
                                </div>
                                <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{tool.title}</h3>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{tool.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="max-w-6xl mx-auto px-3 sm:px-4 py-16">
                    <SectionHeader eyebrow="Testimonials" title="Trusted By Ambitious Learners" subtitle="Built for Smart India Hackathon and designed for real-world growth." />
                    <div className="mt-10 grid md:grid-cols-3 gap-5">
                        {testimonials.map((item, index) => (
                            <motion.div
                                key={item.name}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.2 }}
                                variants={fadeUp}
                                transition={{ duration: 0.4, delay: index * 0.06 }}
                                className="glass-card rounded-2xl p-6 border border-white/40 dark:border-slate-700/60"
                            >
                                <p className="text-slate-700 dark:text-slate-200">"{item.quote}"</p>
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.role}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="max-w-6xl mx-auto px-3 sm:px-4 pb-20">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={fadeUp}
                        transition={{ duration: 0.45 }}
                        className="rounded-3xl p-8 sm:p-12 text-center border border-blue-300/40 dark:border-blue-700/40 bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-indigo-500/20 backdrop-blur"
                    >
                        <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Start your AI-powered journey today
                        </h3>
                        <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                            Move from confusion to clarity with personalized roadmaps, AI coaching, and measurable progress.
                        </p>
                        <button onClick={onGetStarted} className="dynamic-button mt-8">Create Your Roadmap</button>
                    </motion.div>
                </section>

                <footer id="contact" className="border-t border-slate-200/70 dark:border-slate-700/70 py-8 px-3 sm:px-4">
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-3">
                            <a href="#" className="hover:text-blue-600 transition-colors">About</a>
                            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
                            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
                        </div>
                        <div className="flex items-center gap-3 text-lg">
                            <a href="#" aria-label="LinkedIn" className="hover:text-blue-600 transition-colors"><ion-icon name="logo-linkedin"></ion-icon></a>
                            <a href="#" aria-label="X" className="hover:text-blue-600 transition-colors"><ion-icon name="logo-twitter"></ion-icon></a>
                            <a href="#" aria-label="GitHub" className="hover:text-blue-600 transition-colors"><ion-icon name="logo-github"></ion-icon></a>
                        </div>
                        <p>© {new Date().getFullYear()} Horizon AI. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
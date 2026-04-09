import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface LandingPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  animationType: 'net' | 'globe';
  onToggleAnimation: () => void;
  onGoToAuth: () => void;
}

const highlights = [
  { label: 'Adaptive learning', value: 'Roadmaps tuned to your goals' },
  { label: 'Answer review', value: 'Correct, incorrect, and why' },
  { label: 'Role aware', value: 'Learner, trainer, policymaker views' },
  { label: 'AI support', value: 'Coach, quiz, and interview tools' },
];

const featureCards = [
  {
    glyph: '✦',
    title: 'Smart skill discovery',
    description: 'Surface the skills that matter for the user’s stream, goals, and current stage.',
  },
  {
    glyph: '◌',
    title: 'Focused assessment',
    description: 'Capture current ability with an assessment that feeds a tailored roadmap.',
  },
  {
    glyph: '⌁',
    title: 'Structured roadmap',
    description: 'Turn the result into week-by-week goals, resources, and measurable milestones.',
  },
  {
    glyph: '◉',
    title: 'Coach and review',
    description: 'Keep the user engaged with AI coaching and a clear review of their answers.',
  },
];

const audienceCards = [
  {
    glyph: 'L',
    title: 'Learners',
    description: 'Find the next step, understand mistakes, and keep momentum.',
  },
  {
    glyph: 'T',
    title: 'Trainers',
    description: 'See progress signals fast and guide cohorts more effectively.',
  },
  {
    glyph: 'P',
    title: 'Policy teams',
    description: 'Inspect broad learning patterns and intervention opportunities.',
  },
];

const LandingPage: React.FC<LandingPageProps> = ({ theme, toggleTheme, animationType, onToggleAnimation, onGoToAuth }) => {
  const location = useLocation();
  const skipAutoRedirect = new URLSearchParams(location.search).has('roadmapId');

  useEffect(() => {
    if (skipAutoRedirect) {
      return;
    }

    const timer = window.setTimeout(() => {
      onGoToAuth();
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [onGoToAuth, skipAutoRedirect]);

  return (
    <div className="relative isolate overflow-hidden py-6 sm:py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[-6rem] h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute top-16 right-[-5rem] h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <nav className="glass-card sticky top-3 z-20 flex items-center justify-between gap-3 rounded-3xl border border-white/40 px-4 py-3 shadow-lg backdrop-blur-md dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-xl text-white shadow-md">
              <span aria-hidden="true">✦</span>
            </div>
            <div>
              <p className="roadmap-title-font text-lg font-bold text-slate-900 dark:text-white">Horizon AI</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Learning navigator and assessment hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAnimation}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm transition-colors hover:bg-white dark:border-slate-700/70 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-700/80"
              title={`Switch to ${animationType === 'net' ? 'Globe' : 'Net'} background`}
            >
              <span aria-hidden="true">{animationType === 'net' ? 'NET' : 'GLOBE'}</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-lg text-slate-700 shadow-sm transition-colors hover:bg-white dark:border-slate-700/70 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-700/80"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
            </button>
            <button type="button" onClick={onGoToAuth} className="dynamic-button !py-2 !px-5 text-sm">
              Sign In
            </button>
          </div>
        </nav>

        <section className="grid items-center gap-8 py-4 lg:grid-cols-2 lg:gap-12 lg:py-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
              <span aria-hidden="true">⚡</span>
              AI-first learning system
            </div>

            <div className="space-y-4">
              <h1 className="roadmap-title-font max-w-2xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
                Plan learning, review mistakes, and build confidence in one flow.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
                Horizon AI turns an assessment into an explainable result and a production-ready roadmap, so the user sees progress before the next screen appears.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onGoToAuth} className="dynamic-button w-full sm:w-auto">
                Enter the platform
              </button>
              <div className="flex items-center rounded-full border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
                <span className="mr-2 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Redirecting to login automatically
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {highlights.map((item) => (
                <div key={item.label} className="glass-card rounded-2xl border border-white/40 p-4 dark:border-slate-700/60">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] border border-white/40 p-5 shadow-2xl dark:border-slate-700/60">
            <div className="rounded-[1.5rem] border border-slate-200/70 bg-white/75 p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/75">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-4 dark:border-slate-700/70">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Live preview</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Assessment review in progress</h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Background job active
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {[84, 61, 78, 92].map((value, index) => (
                  <div key={index}>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <span>Week {index + 1}</span>
                      <span>{value}%</span>
                    </div>
                    <progress className="roadmap-progress-bar" value={value} max={100} />
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Score</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">14/15</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Level</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Intermediate</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Plan</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">8 Weeks</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <div key={card.title} className="glass-card rounded-3xl border border-white/40 p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/60">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-xl text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <span aria-hidden="true">{card.glyph}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.description}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {audienceCards.map((card) => (
            <div key={card.title} className="glass-card rounded-3xl border border-white/40 p-5 dark:border-slate-700/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span aria-hidden="true">{card.glyph}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.description}</p>
            </div>
          ))}
        </section>

        <footer className="pb-4 pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Opening the platform now. If you do nothing, the login screen appears automatically.
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
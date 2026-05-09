import React, { useState } from 'react';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabaseService';

interface AuthProps {
    onAuthSuccess: () => void;
}

type AuthMode = 'login' | 'signup';

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');

    const isLogin = mode === 'login';

    const clearNotices = () => {
        setError('');
        setInfoMessage('');
    };

    const switchMode = () => {
        setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
        clearNotices();
        setPassword('');
        setConfirmPassword('');
    };

    const handleEmailAuth = async (event: React.FormEvent) => {
        event.preventDefault();
        clearNotices();

        if (!isLogin && password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                const result = await signInWithEmail(email, password);
                if (!result.success) {
                    throw new Error(result.error || 'Unable to sign in.');
                }

                await onAuthSuccess();
                return;
            }

            const result = await signUpWithEmail(email, password, fullName);
            if (!result.success) {
                throw new Error(result.error || 'Unable to create account.');
            }

            if (result.session) {
                await onAuthSuccess();
                return;
            }

            setInfoMessage('Account created. Please check your email to verify your account before logging in.');
            setMode('login');
            setPassword('');
            setConfirmPassword('');
        } catch (authError) {
            const message = authError instanceof Error ? authError.message : 'Authentication failed.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        clearNotices();
        setLoading(true);

        try {
            const result = await signInWithGoogle();
            if (!result.success) {
                throw new Error(result.error || 'Google sign-in failed.');
            }

            setInfoMessage('Redirecting to Google...');
            // Supabase redirects the browser on success.
        } catch (authError) {
            const message = authError instanceof Error ? authError.message : 'Google sign-in failed.';
            setError(message);
            setLoading(false);
        }
    };

    if (!isSupabaseConfigured()) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="glass-card p-8 w-full max-w-lg text-center border-l-4 border-amber-500">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Database Not Configured</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                        To enable Login and Roadmaps Saving, you need to connect Supabase.
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-left text-sm mb-6 overflow-x-auto font-mono">
                        <p className="text-slate-500 dark:text-slate-400 mb-2">// Add these in <strong className="text-slate-800 dark:text-slate-200">.env</strong>:</p>
                        <p className="text-blue-600 dark:text-blue-400">VITE_SUPABASE_URL=YOUR_PROJECT_URL</p>
                        <p className="text-blue-600 dark:text-blue-400">VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="dynamic-button"
                    >
                        I Added The Keys, Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="glass-card p-8 w-full max-w-md">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 text-center">
                    {isLogin ? 'Welcome Back' : 'Create Your Account'}
                </h2>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label htmlFor="auth-full-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Full Name
                            </label>
                            <input
                                id="auth-full-name"
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Alex Johnson"
                                autoComplete="name"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Email
                        </label>
                        <input
                            id="auth-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Password
                        </label>
                        <input
                            id="auth-password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            autoComplete="current-password"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Confirm Password
                            </label>
                            <input
                                id="auth-confirm-password"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your password"
                                autoComplete="new-password"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {infoMessage && (
                        <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm font-medium">
                            {infoMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="dynamic-button w-full flex justify-center mt-4"
                    >
                        {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded">
                            Or continue with
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
                >
                    <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.655-3.373-11.303-7.962l-6.571,4.819C9.656,39.663,16.318,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.545,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                    {loading ? 'Redirecting...' : 'Sign in with Google'}
                </button>

                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}
                        <button
                            onClick={switchMode}
                            className="ml-2 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;

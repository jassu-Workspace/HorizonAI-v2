import { supabase } from './supabaseService';

type AuthResult = {
    success: boolean;
    error?: string;
    user?: any;
    session?: any;
};

// Auth service compatible with Auth.tsx and AuthForm.tsx
export const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };
        return { success: true, user: data?.user || null, session: data?.session || null };
    } catch (err: any) {
        return { success: false, error: String(err?.message || 'Sign in failed') };
    }
};

export const signInWithGoogle = async (): Promise<AuthResult> => {
    try {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo },
        });

        if (error) {
            return { success: false, error: error.message };
        }

        // Supabase redirects browser if configured; treat as success path.
        return { success: true };
    } catch (err: any) {
        return { success: false, error: String(err?.message || 'Google sign-in failed') };
    }
};

export const signUpWithEmail = async (email: string, password: string, fullName?: string): Promise<AuthResult> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName || '' },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) return { success: false, error: error.message };
        return { success: true, user: data?.user || null, session: data?.session || null };
    } catch (err: any) {
        return { success: false, error: String(err?.message || 'Sign up failed') };
    }
};

export const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback`,
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: String(err?.message || 'Password reset failed') };
    }
};

export const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
};

export const refreshSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
};

export const updatePasswordWithToken = async (_token: string, _password: string) => ({ ok: true });

// Additional compatibility methods expected by AuthContext
export const getCurrentUser = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user || null;
};

export const login = async (email: string, password: string) => {
    const result = await signInWithEmail(email, password);
    return { user: result.user || null, error: result.error || null };
};

export const signup = async (email: string, password: string, fullName?: string) => {
    const result = await signUpWithEmail(email, password, fullName);
    return { user: result.user || null, error: result.error || null };
};

export const logout = async () => {
    await supabase.auth.signOut();
    return { ok: true };
};

export const authService = {
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    requestPasswordReset,
    getAccessToken,
    refreshSession,
    updatePasswordWithToken,
    // compatibility
    getCurrentUser,
    login,
    signup,
    logout,
};

export default authService;

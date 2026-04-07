import { createClient } from '@supabase/supabase-js';
import type { Session, User, AuthError } from '@supabase/supabase-js';

/**
 * SUPABASE AUTHENTICATION SERVICE
 * ================================
 * Production-ready authentication with Google OAuth and Email/Password
 * Provides secure session management and real-time auth state handling
 */

// Initialize Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials. Check .env.local file.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true, // Persist session to localStorage
    autoRefreshToken: true, // Auto-refresh expired tokens
    detectSessionInUrl: true, // Detect session from URL (OAuth callback)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce', // Use PKCE flow for better security
  },
});

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    provider?: 'google' | 'email';
  };
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  session?: Session;
  error?: string;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get current session
 * Returns null if not authenticated
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth] Failed to get session:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    console.error('[Auth] Unexpected error getting session:', error);
    return null;
  }
};

/**
 * Get current authenticated user
 * Returns null if not authenticated
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[Auth] Failed to get user:', error.message);
      return null;
    }
    return user;
  } catch (error) {
    console.error('[Auth] Unexpected error getting user:', error);
    return null;
  }
};

/**
 * Get JWT token from current session
 * Useful for API requests
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    const session = await getCurrentSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('[Auth] Failed to get access token:', error);
    return null;
  }
};

// ============================================
// GOOGLE OAUTH AUTHENTICATION
// ============================================

/**
 * Sign in with Google OAuth
 * Opens Google login page and redirects to callback URL
 */
export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'consent', // Always show consent screen
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Google sign-in failed',
      };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during Google sign-in';
    return { success: false, error: message };
  }
};

// ============================================
// EMAIL/PASSWORD AUTHENTICATION
// ============================================

/**
 * Sign up with email and password
 * Creates new user account with email/password authentication
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthResponse> => {
  try {
    // Validate inputs
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }

    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
          provider: 'email',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Sign-up failed',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Sign-up failed: no user data returned',
      };
    }

    return {
      success: true,
      user: formatUser(data.user),
      session: data.session || undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during sign-up';
    return { success: false, error: message };
  }
};

/**
 * Sign in with email and password
 * Authenticates existing user with email/password
 */
export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  try {
    // Validate inputs
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }

    if (!password) {
      return { success: false, error: 'Password is required' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: 'Login failed: invalid response from server',
      };
    }

    return {
      success: true,
      user: formatUser(data.user),
      session: data.session,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during sign-in';
    return { success: false, error: message };
  }
};

// ============================================
// SESSION REFRESH
// ============================================

/**
 * Manually refresh access token
 * Call this when token is about to expire
 */
export const refreshSession = async (): Promise<AuthResponse> => {
  try {
    const session = await getCurrentSession();

    if (!session?.refresh_token) {
      return {
        success: false,
        error: 'No refresh token available',
      };
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: session.refresh_token,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Token refresh failed',
      };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: 'Token refresh failed: invalid response',
      };
    }

    return {
      success: true,
      user: formatUser(data.user),
      session: data.session,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during token refresh';
    return { success: false, error: message };
  }
};

// ============================================
// LOGOUT
// ============================================

/**
 * Sign out current user
 * Clears session from client and server
 */
export const signOut = async (): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message || 'Sign-out failed',
      };
    }

    // Clear all auth-related data from localStorage
    clearAuthStorage();

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during sign-out';
    return { success: false, error: message };
  }
};

// ============================================
// PASSWORD RESET
// ============================================

/**
 * Send password reset email
 * User receives email with reset link
 */
export const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
  try {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Password reset request failed',
      };
    }

    return {
      success: true,
      error: 'Password reset email sent. Check your inbox.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during password reset';
    return { success: false, error: message };
  }
};

/**
 * Update password with reset token
 * Called after user clicks reset link in email
 */
export const updatePasswordWithToken = async (newPassword: string): Promise<AuthResponse> => {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Password update failed',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Password update failed: invalid response',
      };
    }

    return {
      success: true,
      user: formatUser(data.user),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during password update';
    return { success: false, error: message };
  }
};

// ============================================
// AUTH STATE LISTENER
// ============================================

/**
 * Subscribe to auth state changes
 * Fires callback whenever authentication state changes
 */
export const onAuthStateChange = (
  callback: (user: User | null, session: Session | null) => void,
): (() => void) => {
  const { data: authListener } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(session?.user || null, session);
    },
  );

  return () => {
    authListener?.subscription.unsubscribe();
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format Supabase User to AuthUser
 */
const formatUser = (user: User): AuthUser => {
  return {
    id: user.id,
    email: user.email || '',
    user_metadata: {
      full_name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url,
      provider: user.app_metadata?.provider as 'google' | 'email' | undefined,
    },
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
  };
};

/**
 * Clear all auth-related data from localStorage
 */
const clearAuthStorage = (): void => {
  try {
    // Clear Supabase auth tokens
    const keysToRemove = Object.keys(localStorage).filter(
      (key) =>
        key.startsWith('sb-') ||
        key.includes('auth') ||
        key.startsWith('horizon.auth'),
    );

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('[Auth] Failed to clear localStorage:', error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};

/**
 * Get user profile from database
 * Links to public.users table via user_id
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Auth] Failed to fetch user profile:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Auth] Unexpected error fetching user profile:', error);
    return null;
  }
};

export default supabase;

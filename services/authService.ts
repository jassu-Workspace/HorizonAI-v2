import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseService';

export { supabase };

const OAUTH_CALLBACK_PATH = '/auth/callback';
const PASSWORD_RESET_PATH = '/auth/reset-password';

const isBrowser = typeof window !== 'undefined';

const appOrigin = (): string => {
  if (!isBrowser) return '';

  // Get the full origin including port
  const origin = window.location.origin;

  // For localhost with different ports, use the current one
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return origin;
  }

  // For production, use the origin
  return origin;
};

const absoluteUrl = (path: string): string => {
  return `${appOrigin()}${path}`;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
};

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

const formatUser = (user: User): AuthUser => {
  const provider = user.app_metadata?.provider;
  const normalizedProvider = provider === 'google' || provider === 'email' ? provider : undefined;

  return {
    id: user.id,
    email: user.email || '',
    user_metadata: {
      full_name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url,
      provider: normalizedProvider,
    },
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
  };
};

const clearAuthStorage = (): void => {
  if (!isBrowser) return;

  try {
    const keysToRemove = Object.keys(localStorage).filter((key) => {
      return (
        key.startsWith('sb-') ||
        key.startsWith('horizon.auth') ||
        key === 'horizon.activeRoadmapJobId' ||
        key === 'horizon.workflowStep'
      );
    });

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('[Auth] Failed to clear auth storage:', error);
  }
};

export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('[Auth] Failed to get session:', error.message);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[Auth] Unexpected session error:', error);
    return null;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('[Auth] Failed to get user:', error.message);
      return null;
    }

    return user;
  } catch (error) {
    console.error('[Auth] Unexpected user error:', error);
    return null;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const session = await getCurrentSession();
  return session?.access_token || null;
};

export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    const redirectUrl = absoluteUrl(OAUTH_CALLBACK_PATH);
    console.log('[Auth] Google OAuth redirect URL:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[Auth] Google sign-in error:', error);
      const errorMsg = error.message || 'Google sign-in failed.';

      // Provide helpful error messages
      if (errorMsg.includes('popup')) {
        return {
          success: false,
          error: 'Please allow popups for this site to sign in with Google.',
        };
      }
      if (errorMsg.includes('redirect')) {
        return {
          success: false,
          error: 'Please check that Google OAuth is configured in Supabase. Redirect URL: ' + redirectUrl,
        };
      }

      return {
        success: false,
        error: errorMsg,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[Auth] Google OAuth error:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Google sign-in failed. Please try again.'),
    };
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthResponse> => {
  try {
    const trimmedEmail = email.trim();
    const trimmedName = fullName?.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName || trimmedEmail.split('@')[0],
          provider: 'email',
        },
        emailRedirectTo: absoluteUrl(OAUTH_CALLBACK_PATH),
      },
    });

    if (error) {
      return {
        success: false,
        error: toErrorMessage(error, 'Could not create your account.'),
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Sign-up failed: no user was returned by the server.',
      };
    }

    return {
      success: true,
      user: formatUser(data.user),
      session: data.session || undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, 'Could not create your account.'),
    };
  }
};

export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  try {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!password) {
      return { success: false, error: 'Password is required.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      return {
        success: false,
        error: toErrorMessage(error, 'Invalid email or password.'),
      };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: 'Login failed: no valid session was returned.',
      };
    }

    return {
      success: true,
      user: formatUser(data.user),
      session: data.session,
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, 'Invalid email or password.'),
    };
  }
};

export const refreshSession = async (): Promise<AuthResponse> => {
  try {
    const currentSession = await getCurrentSession();

    if (!currentSession?.refresh_token) {
      return {
        success: false,
        error: 'No refresh token available.',
      };
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: currentSession.refresh_token,
    });

    if (error) {
      return {
        success: false,
        error: toErrorMessage(error, 'Session refresh failed.'),
      };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: 'Session refresh failed: invalid server response.',
      };
    }

    return {
      success: true,
      user: formatUser(data.user),
      session: data.session,
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, 'Session refresh failed.'),
    };
  }
};

export const signOut = async (): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: toErrorMessage(error, 'Sign-out failed.'),
      };
    }

    clearAuthStorage();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, 'Sign-out failed.'),
    };
  }
};

export const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
  try {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: absoluteUrl(PASSWORD_RESET_PATH),
    });

    if (error) {
      return {
        success: false,
        error: toErrorMessage(error, 'Password reset request failed.'),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, 'Password reset request failed.'),
    };
  }
};

export const updatePasswordWithToken = async (newPassword: string): Promise<AuthResponse> => {
  try {
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters.',
      };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        error: toErrorMessage(error, 'Password update failed.'),
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Password update failed: invalid server response.',
      };
    }

    return {
      success: true,
      user: formatUser(data.user),
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error, 'Password update failed.'),
    };
  }
};

export const onAuthStateChange = (
  callback: (user: User | null, session: Session | null) => void,
): (() => void) => {
  const { data } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
    callback(session?.user || null, session);
  });

  return () => {
    data?.subscription.unsubscribe();
  };
};

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
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

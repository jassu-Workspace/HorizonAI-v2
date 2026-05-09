import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseService';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  skills?: string;
  interests?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider: Manages authentication state globally
 * - Checks session on mount (once)
 * - Provides auth methods (login, signup, logout)
 * - NO REDIRECTS (routes handle all redirects)
 * - Prevents infinite redirect loops
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Initialize auth state on mount
   * CRITICAL: This runs ONCE to check if user has valid session
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[Auth] Initializing auth state...');
        const currentUser = await authService.getCurrentUser();

        if (currentUser) {
          console.log('[Auth] User found:', currentUser.id);
          setUser(currentUser);
          setIsAuthenticated(true);
        } else {
          console.log('[Auth] No authenticated user');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('[Auth] Failed to initialize:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []); // CRITICAL: Empty array = run once on mount

  /**
   * Login with email/password
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { user: newUser, error } = await authService.login(email, password);
      if (error) {
        throw new Error(error);
      }
      setUser(newUser);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sign up with email/password
   */
  const signup = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const { user: newUser, error } = await authService.signup(
          email,
          password,
          fullName
        );
        if (error) {
          throw new Error(error);
        }
        setUser(newUser);
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Logout: Clear session and state
   * IMPORTANT: No redirect here, routes handle redirects
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();

      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh user profile from server
   */
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();

      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth Hook
 * Use this hook in any component to access auth state
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

export default AuthContext;

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from '../components/Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * PROTECTED ROUTE COMPONENT
 * =========================
 * Restricts access to authenticated users only
 * - If loading: show loader
 * - If not authenticated: <Navigate to="/login" />
 * - If authenticated: render children
 *
 * CRITICAL: Uses <Navigate> to prevent redirect loops
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // If still loading, show loader (prevents redirect flicker)
  if (isLoading) {
    return <AuthLoader />;
  }

  // If not authenticated, redirect to login (ONCE)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated: render component
  return <>{children}</>;
};

/**
 * PUBLIC ROUTE COMPONENT
 * ======================
 * For pages like login/signup
 * - If loading: show loader
 * - If authenticated: <Navigate to="/dashboard" />
 * - If not authenticated: render children
 */
export const PublicRoute: React.FC<ProtectedRouteProps> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // If still loading, show loader
  if (isLoading) {
    return <AuthLoader />;
  }

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Not authenticated: render component (login/signup)
  return <>{children}</>;
};

/**
 * AUTH LOADER COMPONENT
 */
const AuthLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  }}>
    <Loader message="Loading..." />
  </div>
);

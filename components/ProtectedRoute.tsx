import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from '../components/Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PROTECTED ROUTE COMPONENT
 * =========================
 * Restricts access to authenticated users only
 * Redirects to login if not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback = <DefaultLoader />,
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    // Redirect to login page (using React Router navigate would be better,
    // but window.location.href is safe here since this component is outside the router context)
    window.location.href = '/login';
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * PUBLIC ROUTE COMPONENT
 * ======================
 * Only accessible if NOT authenticated
 * Redirects to dashboard if already logged in
 */
export const PublicRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback = <DefaultLoader />,
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <>{fallback}</>;
  }

  if (isAuthenticated) {
    // Redirect to dashboard
    window.location.href = '/dashboard';
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * DEFAULT LOADER COMPONENT
 */
const DefaultLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader message="Loading..." />
  </div>
);

/**
 * REQUIRE AUTH HOOK
 * =================
 * Use in components to require authentication
 * Returns user if authenticated, null otherwise
 */
export const useRequireAuth = () => {
  const { user, isAuthenticated, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated, loading]);

  return user;
};

/**
 * REQUIRE ROLE HOOK
 * =================
 * Use to require specific user role
 * Requires custom role field in user metadata
 */
export const useRequireRole = (requiredRole: string) => {
  const { user, loading } = useAuth();
  const userRole = user?.user_metadata?.role as string | undefined;

  React.useEffect(() => {
    if (!loading && userRole !== requiredRole) {
      window.location.href = '/login';
    }
  }, [userRole, loading, requiredRole]);

  return user;
};

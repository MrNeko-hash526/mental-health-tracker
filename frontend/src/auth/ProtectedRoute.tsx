import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

type Props = { children: React.ReactNode };

/**
 * Protect routes that require authentication.
 * If not authenticated, redirect to /login and preserve the attempted location in state.
 */
export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * Public route wrapper - redirects authenticated users away from auth pages.
 * If authenticated, send to dashboard (adjust path if needed).
 */
export const PublicRoute: React.FC<Props> = ({ children }) => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
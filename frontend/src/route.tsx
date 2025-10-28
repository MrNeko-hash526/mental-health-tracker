import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './layout/layout';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute, PublicRoute } from './auth/ProtectedRoute';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const MoodTracker = lazy(() => import('./pages/MoodTracker'));
const Journal = lazy(() => import('./pages/Journal'));
const Meditation = lazy(() => import('./pages/Meditation'));
const Goals = lazy(() => import('./pages/Goals'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

const SpinnerFallback: React.FC = () => (
  <div className="w-full h-40 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white/60" />
  </div>
);

const render =
  (Component: React.LazyExoticComponent<React.ComponentType<any>>) =>
  (
    <Suspense fallback={<SpinnerFallback />}>
      <Component />
    </Suspense>
  );

const NotFound: React.FC = () => (
  <div className="max-w-3xl mx-auto py-20 text-center">
    <h1 className="text-3xl font-bold mb-2">404 — Not found</h1>
    <p className="text-sm text-gray-500">The page you are looking for does not exist.</p>
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthProvider>
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      </AuthProvider>
    ),
    children: [
      { index: true, element: render(Dashboard) },
      { path: 'dashboard', element: render(Dashboard) },
      { path: 'mood-tracker', element: render(MoodTracker) },
      { path: 'journal', element: render(Journal) },
      { path: 'meditation', element: render(Meditation) },
      { path: 'goals', element: render(Goals) },
      { path: 'profile', element: render(Profile) },
    ],
  },

  { path: '/login', element: <AuthProvider><PublicRoute>{render(Login)}</PublicRoute></AuthProvider> },
  { path: '/signup', element: <AuthProvider><PublicRoute>{render(Signup)}</PublicRoute></AuthProvider> },

  { path: '*', element: <NotFound /> },
]);

export default router;
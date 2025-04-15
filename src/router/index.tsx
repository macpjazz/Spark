// src/router/index.tsx
import { Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import UserDetailsForm from '../pages/UserDetailsForm';
import AuthPage from '../pages/AuthPage';
import NotFound from '../pages/NotFound';
import AdminDashboard from '../pages/AdminDashboard';
import CampaignChallengePage from '../pages/CampaignChallengePage';
import QuestionsPage from '../pages/QuestionsPage';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../hooks/useAuth';
import AdminRoute from '../components/AdminRoute';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (user?.isNewUser && window.location.pathname !== '/user-details') {
    return <Navigate to="/user-details" replace />;
  }

  if (!user?.isNewUser && window.location.pathname === '/user-details') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const routes = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
    errorElement: <ErrorBoundary />
  },
  {
    path: '/auth',
    element: <AuthPage />,
    errorElement: <ErrorBoundary />
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />
  },
  {
    path: '/user-details',
    element: (
      <ProtectedRoute>
        <UserDetailsForm />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    ),
    errorElement: <ErrorBoundary />
  },
  {
    path: '/admin/campaigns/:campaignId/questions',
    element: (
      <AdminRoute>
        <QuestionsPage />
      </AdminRoute>
    ),
    errorElement: <ErrorBoundary />
  },
  {
    path: '/campaign-challenge/:campaignId',
    element: (
      <ProtectedRoute>
        <CampaignChallengePage />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />
  },
  {
    path: '*',
    element: <NotFound />,
    errorElement: <ErrorBoundary />
  }
];

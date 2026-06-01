import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Initialize Firebase
import './config/firebase';

// Contexts
import { AuthProvider } from './context/AuthContext';

// Components
import { Layout } from './components';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/Login/LoginPage';
import SignupPage from './pages/Login/SignupPage';
import FirstLoginPage from './pages/Auth/FirstLoginPage';
import ProfilePage from './pages/Profile/ProfilePage';
import OverviewPage from './pages/Overview/OverviewPage';
import UsersPage from './pages/Users/UsersPage';
import RegistrationPage from './pages/Registration/RegistrationPage';
import CoursesPage from './pages/Courses/CoursesPage';
import SessionsPage from './pages/Sessions/SessionsPage';
import SessionDetailPage from './pages/Sessions/SessionDetailPage';
import ReportsPage from './pages/Reports/ReportsPage';
import AnomaliesPage from './pages/Anomalies/AnomaliesPage';
import AuditPage from './pages/Audit/AuditPage';
import NotFound from './pages/NotFound';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '14px',
              background: '#111827',
              color: '#f8fafc',
              boxShadow: '0 18px 60px rgba(15, 23, 42, 0.18)',
            },
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/first-login" element={<FirstLoginPage />} />

          {/* Protected Routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<ProfilePage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="registrations" element={<RegistrationPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="anomalies" element={<AnomaliesPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>

          {/* Catch-all NotFound */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

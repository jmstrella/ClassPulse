import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import SessionsPage from '../pages/SessionsPage';
import SessionPage from '../pages/SessionPage';
import { AuthProvider } from './AuthProvider';

export const router = createBrowserRouter([
  {
    // Login lives outside AppLayout so the navbar is never rendered on it
    path: '/login',
    element: (
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    ),
  },
  {
    element: (
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    ),
    children: [
      { path: '/', element: <Navigate to="/sessions" replace /> },
      {
        path: '/sessions',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <SessionsPage /> },
          { path: ':sessionId', element: <SessionPage /> },
        ]
      }
    ]
  }
]);

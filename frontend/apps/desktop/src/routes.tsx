import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import { RequireAuth } from '@superion/auth';
import { Skeleton } from '@superion/ui';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ManualsPage = lazy(() => import('./pages/ManualsPage'));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/dashboard',
    element: withSuspense(
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>,
    ),
  },
  {
    path: '/manuals',
    element: withSuspense(
      <RequireAuth>
        <ManualsPage />
      </RequireAuth>,
    ),
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

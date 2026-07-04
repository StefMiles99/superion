import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import { RequireAuth } from '@superion/auth';
import { Skeleton } from '@superion/ui';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const WorkOrdersPage = lazy(() => import('./pages/WorkOrdersPage'));

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
    path: '/work-orders',
    element: withSuspense(
      <RequireAuth>
        <WorkOrdersPage />
      </RequireAuth>,
    ),
  },
  {
    path: '/',
    element: <Navigate to="/work-orders" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/work-orders" replace />,
  },
]);

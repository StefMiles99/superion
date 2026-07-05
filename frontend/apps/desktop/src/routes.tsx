import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import { RequireAuth } from '@superion/auth';
import { Skeleton } from '@superion/ui';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SessionDetailPage = lazy(() => import('./pages/SessionDetailPage'));
const ManualsPage = lazy(() => import('./pages/ManualsPage'));
const ManualUploadPage = lazy(() => import('./pages/ManualUploadPage'));
const ManualDetailPage = lazy(() => import('./pages/ManualDetailPage'));
const ProcedureTemplatesPage = lazy(() => import('./pages/ProcedureTemplatesPage'));
const ProcedureTemplateEditorPage = lazy(() => import('./pages/ProcedureTemplateEditorPage'));

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
    path: '/sessions/:id',
    element: withSuspense(
      <RequireAuth>
        <SessionDetailPage />
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
    path: '/manuals/upload',
    element: withSuspense(
      <RequireAuth>
        <ManualUploadPage />
      </RequireAuth>,
    ),
  },
  {
    path: '/manuals/:id',
    element: withSuspense(
      <RequireAuth>
        <ManualDetailPage />
      </RequireAuth>,
    ),
  },
  {
    path: '/procedures',
    element: withSuspense(
      <RequireAuth>
        <ProcedureTemplatesPage />
      </RequireAuth>,
    ),
  },
  {
    path: '/procedures/new',
    element: withSuspense(
      <RequireAuth>
        <ProcedureTemplateEditorPage />
      </RequireAuth>,
    ),
  },
  {
    path: '/procedures/:id',
    element: withSuspense(
      <RequireAuth>
        <ProcedureTemplateEditorPage />
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

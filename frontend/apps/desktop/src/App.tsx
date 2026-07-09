import { Spinner } from "@superion/ui";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAdmin } from "@/components/RequireAdmin";
import { useBootstrapAuth } from "@/hooks/useAuth";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ManualsPage = lazy(() => import("@/pages/ManualsPage"));
const SessionsPage = lazy(() => import("@/pages/SessionsPage"));
const SessionDetailPage = lazy(() => import("@/pages/SessionDetailPage"));

function Fallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950">
      <Spinner />
    </div>
  );
}

export function App() {
  useBootstrapAuth();

  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/manuals"
          element={
            <RequireAdmin>
              <ManualsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/sessions"
          element={
            <RequireAdmin>
              <SessionsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/sessions/:id"
          element={
            <RequireAdmin>
              <SessionDetailPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/manuals" replace />} />
      </Routes>
    </Suspense>
  );
}

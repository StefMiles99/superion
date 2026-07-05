import { Screen, Spinner } from "@superion/ui";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/components/RequireAuth";
import { useBootstrapAuth } from "@/hooks/useAuth";

// Code-splitting: cada página se carga bajo demanda.
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const WorkOrdersPage = lazy(() => import("@/pages/WorkOrdersPage"));
const WorkOrderDetailPage = lazy(() => import("@/pages/WorkOrderDetailPage"));
const SessionPage = lazy(() => import("@/pages/SessionPage"));
const ReportPage = lazy(() => import("@/pages/ReportPage"));

function Fallback() {
  return (
    <Screen className="items-center justify-center">
      <Spinner />
    </Screen>
  );
}

export function App() {
  useBootstrapAuth();

  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/work-orders"
          element={
            <RequireAuth>
              <WorkOrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/work-orders/:id"
          element={
            <RequireAuth>
              <WorkOrderDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/session/:id"
          element={
            <RequireAuth>
              <SessionPage />
            </RequireAuth>
          }
        />
        <Route
          path="/report/:id"
          element={
            <RequireAuth>
              <ReportPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/work-orders" replace />} />
      </Routes>
    </Suspense>
  );
}

import { useAuthStore } from "@superion/auth";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

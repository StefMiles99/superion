import { useAuthStore } from "@superion/auth";
import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { Navigate } from "react-router-dom";
import { canAccessDesktop } from "@/lib/desktopAccess";
import { useServices } from "@/services/context";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clear = useAuthStore((s) => s.clear);
  const { tokens } = useServices();

  const roleDenied = Boolean(isAuthenticated && user && !canAccessDesktop(user.role));

  useLayoutEffect(() => {
    if (!roleDenied) return;
    tokens.clear();
    clear();
  }, [roleDenied, tokens, clear]);

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (roleDenied) {
    return <Navigate to="/login" replace state={{ roleDenied: true }} />;
  }
  return <>{children}</>;
}

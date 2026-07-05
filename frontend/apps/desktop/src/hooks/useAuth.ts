import { useAuthStore } from "@superion/auth";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { canAccessDesktop } from "@/lib/desktopAccess";
import { useServices } from "@/services/context";

export class DesktopAccessDeniedError extends Error {
  constructor() {
    super("DESKTOP_ACCESS_DENIED");
    this.name = "DesktopAccessDeniedError";
  }
}

export function useBootstrapAuth(): void {
  const { tokens } = useServices();
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  useEffect(() => {
    const user = tokens.getUser();
    const access = tokens.getAccess();
    if (!user || !access) return;

    if (!canAccessDesktop(user.role)) {
      tokens.clear();
      clear();
      navigate("/login", { replace: true, state: { roleDenied: true } });
      return;
    }

    setUser(user);
  }, [tokens, setUser, clear, navigate]);
}

export function useLogin() {
  const { api, tokens } = useServices();
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const session = await api.login(email, password);
      if (!canAccessDesktop(session.user.role)) {
        throw new DesktopAccessDeniedError();
      }
      return session;
    },
    onSuccess: (session) => {
      tokens.save(session);
      setUser(session.user);
      navigate("/manuals", { replace: true });
    },
  });
}

export function useLogout() {
  const { api, tokens } = useServices();
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => {
      tokens.clear();
      clear();
      navigate("/login", { replace: true });
    },
  });
}

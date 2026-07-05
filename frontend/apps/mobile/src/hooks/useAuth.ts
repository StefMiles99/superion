import { useAuthStore } from "@superion/auth";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useServices } from "@/services/context";

/** Restaura la sesión persistida al arrancar la app. */
export function useBootstrapAuth(): void {
  const { tokens } = useServices();
  const setUser = useAuthStore((s) => s.setUser);
  useEffect(() => {
    const user = tokens.getUser();
    if (user && tokens.getAccess()) setUser(user);
  }, [tokens, setUser]);
}

export function useLogin() {
  const { api, tokens } = useServices();
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (session) => {
      tokens.save(session);
      setUser(session.user);
      navigate("/work-orders", { replace: true });
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

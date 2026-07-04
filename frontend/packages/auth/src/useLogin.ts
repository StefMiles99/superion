import { useMutation } from '@tanstack/react-query';

import { getApiClient } from '@superion/api-client';
import { createAuthSession, getDefaultRouteForRole, type LoginInput } from '@superion/domain';

import { syncApiTokensFromSession, useAuthStore } from './useAuth';

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const api = getApiClient();
      const response = await api.login(input);
      return createAuthSession(response, Date.now());
    },
    onSuccess: (session) => {
      setSession(session);
      syncApiTokensFromSession();
    },
  });
}

export function useLoginRedirectPath(): string | null {
  const session = useAuthStore((state) => state.session);
  if (!session) {
    return null;
  }
  return getDefaultRouteForRole(session.user.role);
}

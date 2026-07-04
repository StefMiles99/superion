import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getApiClient } from '@superion/api-client';

import { syncApiTokensFromSession, useAuthStore } from './useAuth';

export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      await api.logout();
    },
    onSettled: () => {
      clearSession();
      syncApiTokensFromSession();
      queryClient.clear();
    },
  });
}

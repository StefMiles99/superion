import { getApiClient } from '@superion/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reportQueryKey } from './useReport';

export function useFinalizeSession(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      return api.finalizeSession(sessionId!);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      await queryClient.invalidateQueries({ queryKey: reportQueryKey(sessionId) });
    },
  });
}

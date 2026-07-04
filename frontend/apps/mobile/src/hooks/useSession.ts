import { getApiClient } from '@superion/api-client';
import type { ProcedureTemplate } from '@superion/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const STALE_TIME_MS = 10_000;

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const api = getApiClient();
      return api.getSession(sessionId!);
    },
    enabled: Boolean(sessionId),
    staleTime: STALE_TIME_MS,
  });
}

export function useSessionProcedure(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['session', sessionId, 'procedure'],
    queryFn: (): ProcedureTemplate => {
      const cached = queryClient.getQueryData<ProcedureTemplate>([
        'session',
        sessionId,
        'procedure',
      ]);
      if (!cached) {
        throw new Error('Plantilla de procedimiento no disponible');
      }
      return cached;
    },
    enabled: Boolean(sessionId),
    staleTime: Infinity,
  });
}

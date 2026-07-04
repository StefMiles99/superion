import { getApiClient } from '@superion/api-client';
import { useAuth } from '@superion/auth';
import { getWsClient, WS_EVENT_PATTERNS } from '@superion/ws-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

const STALE_TIME_MS = 5_000;

export function reportQueryKey(sessionId: string | undefined) {
  return ['session', sessionId, 'report'] as const;
}

export function useReport(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();

  const query = useQuery({
    queryKey: reportQueryKey(sessionId),
    queryFn: async () => {
      const api = getApiClient();
      return api.getReport(sessionId!);
    },
    enabled: Boolean(sessionId),
    staleTime: STALE_TIME_MS,
  });

  useEffect(() => {
    if (!sessionId || !authSession?.accessToken) {
      return;
    }

    const ws = getWsClient();
    const api = getApiClient();

    const unsubscribe = ws.subscribe(WS_EVENT_PATTERNS.REPORT, (event) => {
      if (event.type !== 'report.updated') {
        return;
      }

      void api.getReport(sessionId).then((report) => {
        queryClient.setQueryData(reportQueryKey(sessionId), report);
      });
    });

    return unsubscribe;
  }, [authSession?.accessToken, queryClient, sessionId]);

  return query;
}

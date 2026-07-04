import { useAuth } from '@superion/auth';
import type { ActiveSessionsFilter, SessionSummary, WsConnectionState } from '@superion/domain';
import { applySessionWsEvent, filterSessionSummaries } from '@superion/domain';
import { getApiClient } from '@superion/api-client';
import { getWsClient, WS_EVENT_PATTERNS } from '@superion/ws-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface ActiveSessionsState {
  sessions: SessionSummary[];
  allSessions: SessionSummary[];
  isLoading: boolean;
  isError: boolean;
  connectionState: WsConnectionState;
}

export function useActiveSessions(
  plantId: string | undefined,
  filters: ActiveSessionsFilter,
): ActiveSessionsState {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  const [connectionState, setConnectionState] = useState<WsConnectionState>('closed');

  const queryKey = useMemo(() => ['activeSessions', plantId] as const, [plantId]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(plantId && authSession?.accessToken),
    queryFn: async () => {
      if (!plantId) {
        return [];
      }
      return getApiClient().listActiveSessions(plantId);
    },
  });

  const handleWsEvent = useCallback(
    (event: Parameters<typeof applySessionWsEvent>[1]) => {
      if (!plantId) {
        return;
      }

      queryClient.setQueryData<SessionSummary[]>(queryKey, (current) => {
        const base = current ?? [];
        return applySessionWsEvent(base, event, { plantId });
      });
    },
    [plantId, queryClient, queryKey],
  );

  useEffect(() => {
    if (!plantId || !authSession?.accessToken) {
      return;
    }

    const ws = getWsClient();
    let mounted = true;
    const unsubscribes: Array<() => void> = [];

    if (ws.onConnectionStateChange) {
      unsubscribes.push(
        ws.onConnectionStateChange((state) => {
          if (mounted) {
            setConnectionState(state);
          }
        }),
      );
    }

    unsubscribes.push(ws.subscribe(WS_EVENT_PATTERNS.SESSION, handleWsEvent));

    if (ws.connectAdmin) {
      void ws.connectAdmin(plantId, authSession.accessToken);
    }

    return () => {
      mounted = false;
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
      void ws.disconnect();
      setConnectionState('closed');
    };
  }, [authSession?.accessToken, handleWsEvent, plantId]);

  const sessions = useMemo(() => {
    const items = query.data ?? [];
    return filterSessionSummaries(items, filters);
  }, [filters, query.data]);

  return {
    sessions,
    allSessions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    connectionState,
  };
}

import { getApiClient } from '@superion/api-client';
import { useAuth } from '@superion/auth';
import type { Manual, ManualStatus, WsConnectionState } from '@superion/domain';
import { filterManuals } from '@superion/domain';
import { showToast } from '@superion/ui';
import { getWsClient } from '@superion/ws-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ManualsFilter {
  status?: ManualStatus;
  q?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function useManuals(filter: ManualsFilter = {}) {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  const [connectionState, setConnectionState] = useState<WsConnectionState>('closed');

  const queryKey = useMemo(() => ['manuals'] as const, []);

  const query = useQuery({
    queryKey,
    enabled: Boolean(authSession?.accessToken),
    queryFn: async () => {
      const response = await getApiClient().listManuals();
      return response.items;
    },
  });

  const handleWsEvent = useCallback(
    (event: { type: string; payload: unknown }) => {
      if (event.type !== 'manual.index_status_changed' || !isRecord(event.payload)) {
        return;
      }

      const manualId =
        typeof event.payload.manual_id === 'string' ? event.payload.manual_id : null;
      const indexStatus =
        typeof event.payload.index_status === 'string' ? event.payload.index_status : null;
      const chunkCount =
        typeof event.payload.chunk_count === 'number' ? event.payload.chunk_count : null;

      if (!manualId || !indexStatus) {
        return;
      }

      queryClient.setQueryData<Manual[]>(queryKey, (current) => {
        if (!current) {
          return current;
        }

        return current.map((manual) => {
          if (manual.id !== manualId) {
            return manual;
          }

          const nextStatus =
            indexStatus === 'indexed'
              ? 'active'
              : indexStatus === 'pending'
                ? 'indexing'
                : manual.status;

          return {
            ...manual,
            status: nextStatus as Manual['status'],
            indexStatus: indexStatus as Manual['indexStatus'],
            chunkCount: chunkCount ?? manual.chunkCount,
          };
        });
      });
    },
    [queryClient, queryKey],
  );

  useEffect(() => {
    if (!authSession?.accessToken || !authSession.user.plantId) {
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

    unsubscribes.push(ws.subscribe('manual.*', handleWsEvent));

    if (ws.connectAdmin) {
      void ws.connectAdmin(authSession.user.plantId, authSession.accessToken);
    }

    return () => {
      mounted = false;
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
      void ws.disconnect();
      setConnectionState('closed');
    };
  }, [authSession?.accessToken, authSession?.user.plantId, handleWsEvent]);

  const manuals = useMemo(() => filterManuals(query.data ?? [], filter), [filter, query.data]);

  return {
    manuals,
    allManuals: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    connectionState,
    invalidate: () => queryClient.invalidateQueries({ queryKey }),
  };
}

export function useManualActions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const invalidateManuals = () => {
    void queryClient.invalidateQueries({ queryKey: ['manuals'] });
    void queryClient.invalidateQueries({ queryKey: ['manual'] });
  };

  const reindexMutation = useMutation({
    mutationFn: async (manualId: string) => getApiClient().reindexManual(manualId),
    onSuccess: () => {
      invalidateManuals();
      showToast(t('manuals.toast.reindexStarted'));
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (manualId: string) => getApiClient().archiveManual(manualId),
    onSuccess: () => {
      invalidateManuals();
      showToast(t('manuals.toast.archived'));
    },
  });

  return {
    reindexManual: reindexMutation,
    archiveManual: archiveMutation,
  };
}

export function useManual(manualId: string | undefined) {
  const { session: authSession } = useAuth();

  return useQuery({
    queryKey: ['manual', manualId],
    enabled: Boolean(manualId && authSession?.accessToken),
    queryFn: async () => {
      if (!manualId) {
        throw new Error('manualId requerido');
      }
      return getApiClient().getManual(manualId);
    },
  });
}

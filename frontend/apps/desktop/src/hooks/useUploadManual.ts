import { getApiClient } from '@superion/api-client';
import { useAuth } from '@superion/auth';
import type { ManualUploadInput, UploadProgressPhase } from '@superion/domain';
import { getWsClient } from '@superion/ws-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function useUploadManual() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  const [phase, setPhase] = useState<UploadProgressPhase>('idle');
  const [manualId, setManualId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setManualId(null);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!manualId || !authSession?.accessToken || !authSession.user.plantId) {
      return;
    }

    const ws = getWsClient();
    let mounted = true;

    if (ws.connectAdmin) {
      void ws.connectAdmin(authSession.user.plantId, authSession.accessToken);
    }

    const unsubscribe = ws.subscribe('manual.index_status_changed', (event) => {
      if (!mounted || !isRecord(event.payload)) {
        return;
      }

      const eventManualId =
        typeof event.payload.manual_id === 'string' ? event.payload.manual_id : null;
      const indexStatus =
        typeof event.payload.index_status === 'string' ? event.payload.index_status : null;

      if (eventManualId !== manualId || !indexStatus) {
        return;
      }

      if (indexStatus === 'pending') {
        setPhase('indexing');
        return;
      }

      if (indexStatus === 'indexed') {
        setPhase('indexed');
        void queryClient.invalidateQueries({ queryKey: ['manuals'] });
        return;
      }

      if (indexStatus === 'failed') {
        setPhase('error');
        setErrorMessage('Indexación fallida');
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [authSession?.accessToken, authSession?.user.plantId, manualId, queryClient]);

  const mutation = useMutation({
    mutationFn: async (input: ManualUploadInput) => {
      setPhase('uploading');
      setErrorMessage(null);
      return getApiClient().uploadManual(input);
    },
    onSuccess: (response) => {
      setManualId(response.manualId);
      setPhase('indexing');
      void queryClient.invalidateQueries({ queryKey: ['manuals'] });

      void (async () => {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, 100);
          });
          try {
            const manual = await getApiClient().getManual(response.manualId);
            if (manual.indexStatus === 'indexed') {
              setPhase('indexed');
              void queryClient.invalidateQueries({ queryKey: ['manuals'] });
              return;
            }
          } catch {
            // retry until mock indexing completes
          }
        }
      })();
    },
    onError: (error) => {
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error al subir');
    },
  });

  return {
    uploadManual: mutation,
    phase,
    manualId,
    errorMessage,
    reset,
  };
}

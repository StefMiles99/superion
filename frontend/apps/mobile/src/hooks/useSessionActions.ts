import { ApiError, getApiClient } from '@superion/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface SessionActionError {
  code: string;
  message: string;
}

function mapApiError(error: unknown): SessionActionError {
  if (error instanceof ApiError) {
    return {
      code: error.code ?? 'UNKNOWN',
      message: error.message,
    };
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }
  return { code: 'UNKNOWN', message: 'Error desconocido' };
}

export function useSessionActions(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidateSession = async () => {
    await queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
  };

  const advanceStep = useMutation({
    mutationFn: async (stepIndex: number) => {
      const api = getApiClient();
      return api.postSessionEvent(sessionId!, {
        eventId: crypto.randomUUID(),
        type: 'step_advance',
        stepIndex,
        payload: {},
      });
    },
    onSuccess: async () => {
      await invalidateSession();
    },
  });

  const pauseSession = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      await api.pauseSession(sessionId!);
    },
    onSuccess: async () => {
      await invalidateSession();
    },
  });

  const resumeSession = useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      await api.resumeSession(sessionId!);
    },
    onSuccess: async () => {
      await invalidateSession();
    },
  });

  const getAdvanceError = (): SessionActionError | null => {
    if (!advanceStep.error) {
      return null;
    }
    return mapApiError(advanceStep.error);
  };

  return {
    advanceStep,
    pauseSession,
    resumeSession,
    getAdvanceError,
    clearAdvanceError: () => advanceStep.reset(),
  };
}

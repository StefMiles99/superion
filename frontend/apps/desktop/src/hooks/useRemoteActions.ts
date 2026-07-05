import { getApiClient } from '@superion/api-client';
import { showToast } from '@superion/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface RemoteActionInput {
  sessionId: string;
  workOrderCode: string;
}

interface AddNoteInput extends RemoteActionInput {
  note: string;
}

export function useRemoteActions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const invalidateSessions = () => {
    void queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
  };

  const pauseMutation = useMutation({
    mutationFn: async ({ sessionId }: RemoteActionInput) => {
      await getApiClient().pauseSession(sessionId);
    },
    onSuccess: (_data, variables) => {
      invalidateSessions();
      showToast(t('dashboard.toast.paused', { code: variables.workOrderCode }));
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async ({ sessionId }: RemoteActionInput) => {
      await getApiClient().resumeSession(sessionId);
    },
    onSuccess: (_data, variables) => {
      invalidateSessions();
      showToast(t('dashboard.toast.resumed', { code: variables.workOrderCode }));
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ sessionId, note }: AddNoteInput) => {
      const api = getApiClient();
      if (!api.addSessionNote) {
        throw new Error('addSessionNote no disponible');
      }
      await api.addSessionNote(sessionId, note);
    },
    onSuccess: (_data, variables) => {
      showToast(t('dashboard.toast.noteAdded', { code: variables.workOrderCode }));
    },
  });

  return {
    pauseSession: pauseMutation,
    resumeSession: resumeMutation,
    addNote: addNoteMutation,
  };
}

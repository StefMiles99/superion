import { getApiClient } from '@superion/api-client';
import { showToast } from '@superion/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface AdminActionInput {
  sessionId: string;
  workOrderCode: string;
}

interface ForceAdvanceInput extends AdminActionInput {
  stepIndex: number;
}

interface AddNoteInput extends AdminActionInput {
  note: string;
}

export function useAdminActions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const invalidateSession = (sessionId: string) => {
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'report'] });
    void queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
  };

  const pauseMutation = useMutation({
    mutationFn: async ({ sessionId }: AdminActionInput) => {
      await getApiClient().pauseSession(sessionId);
    },
    onSuccess: (_data, variables) => {
      invalidateSession(variables.sessionId);
      showToast(t('sessionDetail.admin.toast.paused', { code: variables.workOrderCode }));
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async ({ sessionId }: AdminActionInput) => {
      await getApiClient().resumeSession(sessionId);
    },
    onSuccess: (_data, variables) => {
      invalidateSession(variables.sessionId);
      showToast(t('sessionDetail.admin.toast.resumed', { code: variables.workOrderCode }));
    },
  });

  const forceAdvanceMutation = useMutation({
    mutationFn: async ({ sessionId, stepIndex }: ForceAdvanceInput) => {
      const api = getApiClient();
      if (!api.forceAdvance) {
        throw new Error('forceAdvance no disponible');
      }
      await api.forceAdvance(sessionId, stepIndex);
    },
    onSuccess: (_data, variables) => {
      invalidateSession(variables.sessionId);
      showToast(t('sessionDetail.admin.toast.forceAdvanced', { code: variables.workOrderCode }));
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
      showToast(t('sessionDetail.admin.toast.noteAdded', { code: variables.workOrderCode }));
    },
  });

  return {
    pauseSession: pauseMutation,
    resumeSession: resumeMutation,
    forceAdvance: forceAdvanceMutation,
    addNote: addNoteMutation,
  };
}

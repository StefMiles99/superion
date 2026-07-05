import { getApiClient } from '@superion/api-client';
import { trackEvent } from '@superion/telemetry';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

export function useStartSession() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (workOrderId: string) => {
      const api = getApiClient();
      return api.startSession(workOrderId);
    },
    onSuccess: (data) => {
      trackEvent('session_started', {
        sessionId: data.sessionId,
        workOrderId: data.workOrderId,
      });
      queryClient.setQueryData(['session', data.sessionId], {
        id: data.sessionId,
        workOrderId: data.workOrderId,
        technicianId: '',
        status: 'active' as const,
        startedAt: data.startedAt,
        endedAt: null,
        currentStepIndex: 0,
        langgraphThreadId: data.langgraphThreadId,
        metrics: {
          totalActiveSeconds: 0,
          voiceSeconds: 0,
          photosCount: 0,
          avgStepSeconds: 0,
        },
        nextSeq: 1,
      });
      queryClient.setQueryData(['session', data.sessionId, 'procedure'], data.procedureTemplate);
      void queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      void queryClient.invalidateQueries({ queryKey: ['workOrder', data.workOrderId] });
      navigate(`/sessions/${data.sessionId}`);
    },
  });
}

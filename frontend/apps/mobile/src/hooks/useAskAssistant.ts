import type { AssistantAnswer, AssistantHistoryEntry } from '@superion/domain';
import { getApiClient } from '@superion/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function assistantHistoryQueryKey(sessionId: string | undefined) {
  return ['assistant-history', sessionId] as const;
}

export function useAskAssistant(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: string) => {
      const api = getApiClient();
      return api.askAssistant(sessionId!, question);
    },
    onSuccess: (answer: AssistantAnswer, question: string) => {
      if (!sessionId) {
        return;
      }

      const entry: AssistantHistoryEntry = {
        id: crypto.randomUUID(),
        question,
        answer,
        askedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<AssistantHistoryEntry[]>(
        assistantHistoryQueryKey(sessionId),
        (current = []) => [...current, entry],
      );
    },
  });
}

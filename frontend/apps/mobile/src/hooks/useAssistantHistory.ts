import type { AssistantHistoryEntry } from '@superion/domain';
import { useQuery } from '@tanstack/react-query';

import { assistantHistoryQueryKey } from './useAskAssistant';

export function useAssistantHistory(sessionId: string | undefined) {
  return useQuery<AssistantHistoryEntry[]>({
    queryKey: assistantHistoryQueryKey(sessionId),
    queryFn: () => [],
    enabled: Boolean(sessionId),
    initialData: [],
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

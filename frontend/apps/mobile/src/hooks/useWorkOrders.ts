import { getApiClient } from '@superion/api-client';
import type { WorkOrderFilter } from '@superion/domain';
import { useInfiniteQuery } from '@tanstack/react-query';

const STALE_TIME_MS = 30_000;
const PAGE_LIMIT = 10;

function buildQueryKey(filter: WorkOrderFilter) {
  return [
    'workOrders',
    {
      status: filter.status ?? null,
      priority: filter.priority ?? null,
      q: filter.q ?? null,
    },
  ] as const;
}

export function useWorkOrders(filter: WorkOrderFilter) {
  return useInfiniteQuery({
    queryKey: buildQueryKey(filter),
    queryFn: async ({ pageParam }) => {
      const api = getApiClient();
      return api.listWorkOrders({
        ...filter,
        ...(pageParam ? { cursor: pageParam } : {}),
        limit: PAGE_LIMIT,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME_MS,
  });
}

import { getApiClient } from '@superion/api-client';
import { useQuery } from '@tanstack/react-query';

export function useWorkOrder(workOrderId: string | undefined) {
  return useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: async () => {
      const api = getApiClient();
      return api.getWorkOrder(workOrderId!);
    },
    enabled: Boolean(workOrderId),
  });
}

import { getApiClient } from '@superion/api-client';
import { useAuth } from '@superion/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

export function useProcedureTemplates() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  const queryKey = useMemo(() => ['procedure-templates'] as const, []);

  const query = useQuery({
    queryKey,
    enabled: Boolean(authSession?.accessToken),
    queryFn: async () => {
      const response = await getApiClient().listProcedureTemplates();
      return response.items;
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    invalidate: () => queryClient.invalidateQueries({ queryKey }),
  };
}

export function useProcedureTemplate(templateId: string | undefined) {
  const { session: authSession } = useAuth();

  return useQuery({
    queryKey: ['procedure-template', templateId],
    enabled: Boolean(templateId && authSession?.accessToken),
    queryFn: async () => {
      if (!templateId) {
        throw new Error('templateId requerido');
      }
      return getApiClient().getProcedureTemplate(templateId);
    },
  });
}

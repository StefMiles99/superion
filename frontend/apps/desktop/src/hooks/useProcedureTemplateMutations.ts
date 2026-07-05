import { getApiClient } from '@superion/api-client';
import type { CreateProcedureTemplateInput, UpdateProcedureTemplateInput } from '@superion/domain';
import { showToast } from '@superion/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export function useProcedureTemplateMutations() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['procedure-templates'] });
    void queryClient.invalidateQueries({ queryKey: ['procedure-template'] });
  };

  const createTemplate = useMutation({
    mutationFn: async (input: CreateProcedureTemplateInput) =>
      getApiClient().createProcedureTemplate(input),
    onSuccess: () => {
      invalidate();
      showToast(t('procedures.toast.created'));
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProcedureTemplateInput }) =>
      getApiClient().updateProcedureTemplate(id, input),
    onSuccess: () => {
      invalidate();
      showToast(t('procedures.toast.updated'));
    },
  });

  const archiveTemplate = useMutation({
    mutationFn: async (id: string) => getApiClient().archiveProcedureTemplate(id),
    onSuccess: () => {
      invalidate();
      showToast(t('procedures.toast.archived'));
    },
  });

  return {
    createTemplate,
    updateTemplate,
    archiveTemplate,
  };
}

import type { ManualUploadCommand } from "@superion/domain";
import { isIndexingInProgress } from "@superion/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/services/context";

const MANUALS_KEY = ["manuals"] as const;

export function useManuals() {
  const { api } = useServices();
  return useQuery({
    queryKey: MANUALS_KEY,
    queryFn: () => api.listManuals(),
    // Polling mientras haya indexaciones en curso (contrato §2.6 permite polling).
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((m) => isIndexingInProgress(m.index_status)) ? 1500 : false;
    },
  });
}

export function useUploadManual() {
  const { api } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cmd: ManualUploadCommand) => api.uploadManual(cmd),
    onSuccess: () => void qc.invalidateQueries({ queryKey: MANUALS_KEY }),
  });
}

export function useManualActions() {
  const { api } = useServices();
  const qc = useQueryClient();

  const reindex = useMutation({
    mutationFn: (id: string) => api.reindexManual(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: MANUALS_KEY }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.deleteManual(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: MANUALS_KEY }),
  });

  return { reindex, archive };
}

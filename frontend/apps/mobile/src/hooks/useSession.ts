import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/services/context";
import { useSessionStore } from "@/stores/session";

export function useSessionControls(sessionId: string) {
  const { api } = useServices();
  const qc = useQueryClient();
  const setStatus = useSessionStore((s) => s.setStatus);

  const pause = useMutation({
    mutationFn: () => api.pauseSession(sessionId),
    onSuccess: () => setStatus("paused"),
  });

  const resume = useMutation({
    mutationFn: () => api.resumeSession(sessionId),
    onSuccess: () => setStatus("active"),
  });

  const finalize = useMutation({
    mutationFn: () => api.finalizeSession(sessionId),
    onSuccess: () => {
      setStatus("finalized");
      void qc.invalidateQueries({ queryKey: ["work-orders"] });
    },
  });

  return { pause, resume, finalize };
}

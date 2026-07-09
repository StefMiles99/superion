import { ApiError } from "@superion/domain";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useServices } from "@/services/context";
import { useSessionStore } from "@/stores/session";

function finalizeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "STEP_REQUIRES_PHOTO") {
      return "incompleteSteps";
    }
    if (error.code === "SESSION_ALREADY_FINALIZED") {
      return "alreadyFinalized";
    }
    return error.message;
  }
  return "generic";
}

export function useSessionControls(sessionId: string) {
  const { api } = useServices();
  const qc = useQueryClient();
  const navigate = useNavigate();
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
      void qc.invalidateQueries({ queryKey: ["report", sessionId] });
      navigate(`/report/${sessionId}`, { replace: true });
    },
  });

  return {
    pause,
    resume,
    finalize,
    finalizeErrorKey: finalize.isError ? finalizeErrorMessage(finalize.error) : null,
  };
}

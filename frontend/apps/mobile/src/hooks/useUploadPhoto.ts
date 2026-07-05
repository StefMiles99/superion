import { useMutation } from "@tanstack/react-query";
import { useServices } from "@/services/context";
import { uuid } from "@/lib/utils";
import { useSessionStore } from "@/stores/session";

export interface UploadArgs {
  file: Blob;
  stepIndex: number;
  criteria?: string;
}

/** Sube la foto capturada y refleja el progreso de análisis en el store. */
export function useUploadPhoto(sessionId: string) {
  const { api } = useServices();
  const setAnalysis = useSessionStore((s) => s.setAnalysis);

  return useMutation({
    mutationFn: ({ file, stepIndex, criteria }: UploadArgs) => {
      setAnalysis({ state: "uploading" });
      return api.uploadPhoto(sessionId, {
        file,
        stepIndex,
        eventId: uuid(),
        criteria,
      });
    },
    onError: () => setAnalysis({ state: "rejected", feedback: "upload_error" }),
  });
}

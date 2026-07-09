import { useQuery } from "@tanstack/react-query";
import { useServices } from "@/services/context";

export function useSessions() {
  const { api } = useServices();
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.listSessions(),
  });
}

export function useReport(sessionId: string) {
  const { api } = useServices();
  return useQuery({
    queryKey: ["report", sessionId],
    queryFn: () => api.getReport(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useSessionTranscript(sessionId: string) {
  const { api } = useServices();
  return useQuery({
    queryKey: ["session-events", sessionId],
    queryFn: () => api.listSessionEvents(sessionId, { limit: 500 }),
    enabled: Boolean(sessionId),
    select: (data) => data.items,
  });
}

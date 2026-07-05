import type { ProcedureTemplate } from "@superion/domain";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useServices } from "@/services/context";

export function useWorkOrders() {
  const { api } = useServices();
  return useQuery({
    queryKey: ["work-orders"],
    queryFn: () => api.listWorkOrders(),
  });
}

export function useWorkOrder(id: string) {
  const { api } = useServices();
  return useQuery({
    queryKey: ["work-order", id],
    queryFn: () => api.getWorkOrder(id),
    enabled: Boolean(id),
  });
}

const TEMPLATE_KEY = (sessionId: string) => `superion.template.${sessionId}`;

export function stashTemplate(sessionId: string, template: ProcedureTemplate): void {
  sessionStorage.setItem(TEMPLATE_KEY(sessionId), JSON.stringify(template));
}

export function readTemplate(sessionId: string): ProcedureTemplate | null {
  const raw = sessionStorage.getItem(TEMPLATE_KEY(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProcedureTemplate;
  } catch {
    return null;
  }
}

export function useStartSession() {
  const { api } = useServices();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (workOrderId: string) => api.startSession(workOrderId),
    onSuccess: (result) => {
      stashTemplate(result.session_id, result.procedure_template);
      navigate(`/session/${result.session_id}`);
    },
  });
}

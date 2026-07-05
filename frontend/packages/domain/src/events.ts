// Eventos WebSocket del servidor → cliente (integration_contracts.md §3.3).

export interface WsEvent<P = Record<string, unknown>> {
  seq?: number;
  type: string;
  session_id?: string;
  created_at?: string;
  step_index?: number;
  payload?: P;
}

export interface StepEnteredPayload {
  index: number;
  title: string;
  description: string;
  estimated_minutes: number;
  critical: boolean;
  requires_photo: boolean;
  photo_criteria: string | null;
}

export interface PhotoValidatedPayload {
  photo_id: string;
  step_index: number;
  feedback: string;
  caption?: string;
}

export interface PhotoRejectedPayload {
  photo_id: string;
  step_index: number;
  feedback: string;
  retries: number;
  max_retries: number;
}

export interface AssistantAnsweredPayload {
  step_index: number;
  query: string;
  answer_text: string;
  citations: Array<{
    manual_id: string;
    page?: number;
    section_path?: string;
    snippet?: string;
  }>;
  confidence: number;
}

/** Entrada del transcript de conversación técnico ↔ agente. */
export interface TranscriptEntry {
  id: string;
  speaker: "technician" | "agent";
  text: string;
  stepIndex: number;
  kind: "utterance" | "observation" | "answer";
  createdAt?: string;
}

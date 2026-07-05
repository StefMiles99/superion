// Entidades y DTOs del dominio. Reflejan integration_contracts.md §2 (REST).

export type Role = "technician" | "supervisor" | "rag_admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  plant_id: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserProfile;
}

export type WorkOrderStatus =
  | "pending"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled";

export type Priority = "low" | "med" | "high";

export interface AssetSummary {
  id: string;
  tag: string;
  name: string;
  model: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  type: "preventive" | "corrective";
  priority: Priority;
  status: WorkOrderStatus;
  asset: AssetSummary;
  assigned_to: { id: string; full_name: string };
  planned_start: string;
  planned_end: string;
  procedure_template_id: string;
  procedure_name?: string;
  estimated_minutes?: number;
  description?: string;
  notes?: string;
}

export interface Paginated<T> {
  items: T[];
  next_cursor: string | null;
}

export interface ProcedureStep {
  index: number;
  title: string;
  description: string;
  estimated_minutes: number;
  critical: boolean;
  requires_photo: boolean;
  photo_criteria: string | null;
}

export interface ProcedureTemplate {
  id: string;
  name: string;
  manual_id: string;
  steps: ProcedureStep[];
  critical_step_indices: number[];
  photo_required_step_indices: number[];
  estimated_minutes: number;
}

export interface StartSessionResult {
  session_id: string;
  work_order_id: string;
  procedure_template: ProcedureTemplate;
  langgraph_thread_id: string;
  websocket_url?: string;
  started_at: string;
}

export type SessionStatus = "active" | "paused" | "finalized" | "aborted";

export interface SessionMetrics {
  total_active_seconds: number;
  voice_seconds: number;
  photos_count: number;
  avg_step_seconds: number;
}

export interface Session {
  id: string;
  work_order_id: string;
  technician_id: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  current_step_index: number;
  metrics?: SessionMetrics;
  next_seq: number;
}

export interface VoiceConnect {
  agent_id: string;
  connect_mode: "signed_url" | "webrtc";
  signed_url: string;
  expires_at: string;
  dynamic_variables: Record<string, string>;
}

export type PhotoStatus = "pending" | "accepted" | "rejected";

export interface PhotoUploadResult {
  photo_id: string;
  status: PhotoStatus;
  uploaded_at: string;
}

export interface FinalizeResult {
  session_id: string;
  report_id: string;
  pdf_url?: string;
  pdf_expires_at?: string;
}

export interface UploadPhotoCommand {
  file: Blob;
  stepIndex: number;
  eventId: string;
  criteria?: string;
}

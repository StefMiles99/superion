/** Report JSON — integration_contracts.md §2.5 */

export type ReportStatus = "draft" | "finalized";

export interface ReportHeader {
  ot_code: string;
  technician: string;
  asset: string;
  plant: string;
  started_at: string | null;
  ended_at: string | null;
  duration_min: number | null;
}

export interface ReportProcedureStep {
  index: number;
  title: string;
  status: "pending" | "done" | "skipped";
  skip_reason?: string | null;
  observations: string[];
  findings: Array<{ text: string; severity: string }>;
}

export interface ReportFinding {
  text: string;
  severity: string;
  step_index: number;
}

export interface ReportContent {
  header: ReportHeader;
  summary: string;
  procedure: ReportProcedureStep[];
  findings: ReportFinding[];
  measurements: Array<{ name: string; value: unknown; unit: string; step_index: number }>;
  photos_gallery: Array<{ photo_id: string; step_index: number; caption: string }>;
}

export interface MaintenanceReport {
  id: string;
  session_id: string;
  status: ReportStatus;
  content: ReportContent;
  version: number;
  updated_at: string;
}

export interface SessionListItem {
  id: string;
  work_order_id: string;
  work_order_code: string;
  asset_name: string;
  technician_name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

export interface SessionEventItem {
  seq: number;
  type: string;
  session_id: string;
  step_index: number;
  payload: Record<string, unknown>;
  created_at: string;
}

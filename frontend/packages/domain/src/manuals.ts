// Manuales (RAG) — integration_contracts.md §2.6.

export type ManualStatus = "active" | "archived" | "indexing" | "error";
export type IndexStatus = "indexed" | "pending" | "failed";

export interface Manual {
  id: string;
  title: string;
  asset_model: string;
  version: number;
  status: ManualStatus;
  index_status: IndexStatus;
  chunk_count: number;
  uploaded_at: string;
  uploaded_by: { id: string; full_name: string };
}

export interface ManualUploadCommand {
  file: Blob;
  title: string;
  assetModel: string;
  replacesManualId?: string;
}

export interface ManualUploadResult {
  manual_id: string;
  index_status: IndexStatus;
  estimated_seconds: number;
}

export interface ReindexResult {
  manual_id: string;
  index_status: IndexStatus;
}

export const MAX_MANUAL_BYTES = 50 * 1024 * 1024;

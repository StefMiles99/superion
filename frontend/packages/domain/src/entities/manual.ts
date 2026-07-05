export type ManualStatus = 'active' | 'archived' | 'indexing' | 'error';
export type IndexStatus = 'indexed' | 'pending' | 'failed';

export type UploadProgressPhase =
  | 'idle'
  | 'pending'
  | 'uploading'
  | 'indexing'
  | 'indexed'
  | 'error';

export interface ManualUploader {
  id: string;
  fullName: string;
}

export interface Manual {
  id: string;
  title: string;
  assetModel: string;
  version: number;
  status: ManualStatus;
  indexStatus: IndexStatus;
  chunkCount: number;
  uploadedAt: string;
  uploadedBy: ManualUploader;
}

export interface ManualDetail extends Manual {
  downloadUrl: string;
}

export interface ManualUploadInput {
  file: Blob;
  title: string;
  assetModel: string;
  replacesManualId?: string;
}

export interface ManualUploadResponse {
  manualId: string;
  indexStatus: IndexStatus;
  estimatedSeconds: number;
}

export interface ManualReindexResponse {
  manualId: string;
  indexStatus: IndexStatus;
}

export interface ManualSearchChunk {
  chunkId: string;
  page: number;
  sectionPath: string;
  content: string;
  score: number;
}

export interface ManualSearchResponse {
  items: ManualSearchChunk[];
}

export interface ManualFilter {
  status?: ManualStatus;
  q?: string;
}

const MANUAL_STATUSES: ManualStatus[] = ['active', 'archived', 'indexing', 'error'];
const INDEX_STATUSES: IndexStatus[] = ['indexed', 'pending', 'failed'];

export function isManualStatus(value: string): value is ManualStatus {
  return (MANUAL_STATUSES as string[]).includes(value);
}

export function isIndexStatus(value: string): value is IndexStatus {
  return (INDEX_STATUSES as string[]).includes(value);
}

export function validateManual(manual: Manual): void {
  if (!manual.id.trim()) {
    throw new Error('id no puede estar vacío');
  }
  if (!manual.title.trim()) {
    throw new Error('title no puede estar vacío');
  }
  if (!manual.assetModel.trim()) {
    throw new Error('assetModel no puede estar vacío');
  }
  if (manual.version < 1) {
    throw new Error('version debe ser >= 1');
  }
  if (!isManualStatus(manual.status)) {
    throw new Error(`status inválido: ${manual.status}`);
  }
  if (!isIndexStatus(manual.indexStatus)) {
    throw new Error(`indexStatus inválido: ${manual.indexStatus}`);
  }
  if (manual.chunkCount < 0) {
    throw new Error('chunkCount no puede ser negativo');
  }
  if (!manual.uploadedBy.id.trim()) {
    throw new Error('uploadedBy.id no puede estar vacío');
  }
}

export function filterManuals(manuals: Manual[], filter: ManualFilter = {}): Manual[] {
  let result = manuals;

  if (filter.status) {
    result = result.filter((manual) => manual.status === filter.status);
  }

  const query = filter.q?.trim().toLowerCase();
  if (query) {
    result = result.filter(
      (manual) =>
        manual.title.toLowerCase().includes(query) ||
        manual.assetModel.toLowerCase().includes(query),
    );
  }

  return result;
}

export function isManualArchived(manual: Manual): boolean {
  return manual.status === 'archived';
}

export function isManualIndexed(manual: Manual): boolean {
  return manual.indexStatus === 'indexed';
}

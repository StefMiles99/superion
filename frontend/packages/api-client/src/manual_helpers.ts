import type { ManualSearchChunk, ManualUploader } from '@superion/domain';

export const MANUAL_MAX_SIZE_BYTES = 50 * 1024 * 1024;
export const MANUAL_PDF_MIME = 'application/pdf';

export interface StoredManualRecord {
  id: string;
  title: string;
  assetModel: string;
  version: number;
  status: 'active' | 'archived' | 'indexing' | 'error';
  indexStatus: 'indexed' | 'pending' | 'failed';
  chunkCount: number;
  uploadedAt: string;
  uploadedBy: ManualUploader;
  downloadUrl: string;
  chunks: ManualSearchChunk[];
}

const ADMIN_UPLOADER: ManualUploader = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  fullName: 'Admin Sistema',
};

export function createManualFixtures(): StoredManualRecord[] {
  return [
    {
      id: '990e8400-e29b-41d4-a716-446655440000',
      title: 'Atlas Copco GA-37 — Service Manual',
      assetModel: 'Atlas Copco GA-37',
      version: 3,
      status: 'active',
      indexStatus: 'indexed',
      chunkCount: 3,
      uploadedAt: '2026-06-01T10:00:00Z',
      uploadedBy: ADMIN_UPLOADER,
      downloadUrl: 'mock://manuals/990e8400-e29b-41d4-a716-446655440000',
      chunks: [
        {
          chunkId: 'chunk-1',
          page: 1,
          sectionPath: 'Página 1',
          content: 'Torque de apriete válvula: 85 N·m',
          score: 1,
        },
        {
          chunkId: 'chunk-2',
          page: 42,
          sectionPath: '4. Mantenimiento > 4.3 Válvulas',
          content: 'Revisar presión de aceite cada 500 horas.',
          score: 1,
        },
      ],
    },
    {
      id: '990e8400-e29b-41d4-a716-446655440001',
      title: 'Grundfos CR — Manual de servicio',
      assetModel: 'Grundfos CR 32-4',
      version: 1,
      status: 'indexing',
      indexStatus: 'pending',
      chunkCount: 0,
      uploadedAt: '2026-07-04T08:00:00Z',
      uploadedBy: ADMIN_UPLOADER,
      downloadUrl: 'mock://manuals/990e8400-e29b-41d4-a716-446655440001',
      chunks: [],
    },
  ];
}

export function extractChunksFromText(text: string): ManualSearchChunk[] {
  const pages = text.split('\f');
  const normalizedPages = pages.length > 1 ? pages : text.split('\n');

  return normalizedPages
    .map((content, index) => content.trim())
    .filter((content) => content.length > 0)
    .map((content, index) => ({
      chunkId: `chunk-${index + 1}`,
      page: index + 1,
      sectionPath: `Página ${index + 1}`,
      content,
      score: 1,
    }));
}

export function searchManualChunks(
  chunks: ManualSearchChunk[],
  query: string,
): ManualSearchChunk[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return chunks
    .filter((chunk) => chunk.content.toLowerCase().includes(normalized))
    .map((chunk) => ({
      ...chunk,
      score: chunk.content.toLowerCase().includes(normalized) ? 0.95 : chunk.score,
    }));
}

export function nextManualVersion(manuals: StoredManualRecord[], assetModel: string): number {
  const versions = manuals
    .filter((manual) => manual.assetModel === assetModel)
    .map((manual) => manual.version);
  if (versions.length === 0) {
    return 1;
  }
  return Math.max(...versions) + 1;
}

export function toManualListItem(record: StoredManualRecord) {
  return {
    id: record.id,
    title: record.title,
    assetModel: record.assetModel,
    version: record.version,
    status: record.status,
    indexStatus: record.indexStatus,
    chunkCount: record.chunkCount,
    uploadedAt: record.uploadedAt,
    uploadedBy: record.uploadedBy,
  };
}

export function toManualDetail(record: StoredManualRecord) {
  return {
    ...toManualListItem(record),
    downloadUrl: record.downloadUrl,
  };
}

export function validateManualPdf(file: Blob): void {
  if (file.type && file.type !== MANUAL_PDF_MIME) {
    throw new Error('Solo se aceptan archivos PDF');
  }
  if (file.size > MANUAL_MAX_SIZE_BYTES) {
    throw new Error('El PDF supera el tamaño máximo de 50 MB');
  }
}

export async function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('No se pudo leer el archivo'));
    };
    reader.readAsText(blob);
  });
}

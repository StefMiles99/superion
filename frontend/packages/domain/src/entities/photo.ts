export type PhotoStatus = 'pending' | 'accepted' | 'rejected';

export interface EvidencePhoto {
  id: string;
  sessionId: string;
  stepIndex: number;
  status: PhotoStatus;
  thumbnailUrl: string | null;
  feedback: string | null;
  retries: number;
  maxRetries: number;
  capturedAt: string;
}

export interface PhotoUploadResponse {
  photoId: string;
  status: 'pending';
  uploadedAt: string;
}

const PHOTO_STATUSES: PhotoStatus[] = ['pending', 'accepted', 'rejected'];

export function isPhotoStatus(value: string): value is PhotoStatus {
  return (PHOTO_STATUSES as string[]).includes(value);
}

export function validateEvidencePhoto(photo: EvidencePhoto): void {
  if (!photo.id.trim()) {
    throw new Error('id no puede estar vacío');
  }
  if (!photo.sessionId.trim()) {
    throw new Error('sessionId no puede estar vacío');
  }
  if (photo.stepIndex < 0) {
    throw new Error('stepIndex no puede ser negativo');
  }
  if (!isPhotoStatus(photo.status)) {
    throw new Error(`status inválido: ${photo.status}`);
  }
  if (photo.retries < 0) {
    throw new Error('retries no puede ser negativo');
  }
  if (photo.maxRetries < 1) {
    throw new Error('maxRetries debe ser al menos 1');
  }
  if (photo.retries > photo.maxRetries) {
    throw new Error('retries no puede superar maxRetries');
  }
}

export function isPhotoAccepted(photo: EvidencePhoto): boolean {
  return photo.status === 'accepted';
}

export function isPhotoEscalated(photo: EvidencePhoto): boolean {
  return photo.status === 'rejected' && photo.retries >= photo.maxRetries;
}

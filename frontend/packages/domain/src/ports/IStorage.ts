export interface QueuedPhoto {
  id: string;
  sessionId: string;
  stepIndex: number;
  criteria: string | null;
  fileData: ArrayBuffer;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export interface IPhotoQueueStorage {
  add(item: QueuedPhoto): Promise<void>;
  list(): Promise<QueuedPhoto[]>;
  remove(id: string): Promise<void>;
}

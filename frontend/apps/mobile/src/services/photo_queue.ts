import type { IPhotoQueueStorage, QueuedPhoto } from '@superion/domain';

const DB_NAME = 'superion-photo-queue';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error('No se pudo abrir IndexedDB'));
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);

        request.onsuccess = () => {
          resolve(request.result as T);
        };

        request.onerror = () => {
          reject(request.error ?? new Error('Error en transacción IndexedDB'));
        };

        transaction.oncomplete = () => {
          db.close();
        };
      }),
  );
}

export class PhotoQueueStorage implements IPhotoQueueStorage {
  async add(item: QueuedPhoto): Promise<void> {
    await runTransaction('readwrite', (store) => store.put(item));
  }

  async list(): Promise<QueuedPhoto[]> {
    return runTransaction<QueuedPhoto[]>('readonly', (store) => store.getAll());
  }

  async remove(id: string): Promise<void> {
    await runTransaction('readwrite', (store) => store.delete(id));
  }
}

export const photoQueueStorage = new PhotoQueueStorage();

export async function clearPhotoQueueForTests(): Promise<void> {
  const items = await photoQueueStorage.list();
  await Promise.all(items.map((item) => photoQueueStorage.remove(item.id)));
}

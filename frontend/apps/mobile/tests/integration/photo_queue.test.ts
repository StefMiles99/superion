import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import type { QueuedPhoto } from '@superion/domain';

import { clearPhotoQueueForTests, photoQueueStorage } from '../../src/services/photo_queue';

const sampleItem: QueuedPhoto = {
  id: 'queue-1',
  sessionId: 'sess-1',
  stepIndex: 3,
  criteria: 'sensor visible',
  fileData: new Uint8Array([65, 66, 67]).buffer,
  fileName: 'evidence.jpg',
  mimeType: 'image/jpeg',
  createdAt: '2026-07-04T14:00:00Z',
};

describe('photo_queue IndexedDB storage', () => {
  beforeEach(async () => {
    await clearPhotoQueueForTests();
  });

  it('adds a queued photo', async () => {
    await photoQueueStorage.add(sampleItem);
    const items = await photoQueueStorage.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('queue-1');
  });

  it('lists all queued photos', async () => {
    await photoQueueStorage.add(sampleItem);
    await photoQueueStorage.add({
      ...sampleItem,
      id: 'queue-2',
      stepIndex: 5,
    });

    const items = await photoQueueStorage.list();
    expect(items).toHaveLength(2);
  });

  it('removes a queued photo by id', async () => {
    await photoQueueStorage.add(sampleItem);
    await photoQueueStorage.remove('queue-1');
    const items = await photoQueueStorage.list();
    expect(items).toHaveLength(0);
  });
});

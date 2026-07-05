import { getApiClient } from '@superion/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { photoQueueStorage } from '../services/photo_queue';

export function usePhotoQueue() {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    const items = await photoQueueStorage.list();
    setPendingCount(items.length);
  }, []);

  const processQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing) {
      return;
    }

    const items = await photoQueueStorage.list();
    if (items.length === 0) {
      return;
    }

    setIsSyncing(true);
    const api = getApiClient();

    try {
      for (const item of items) {
        const blob = new Blob([item.fileData], { type: item.mimeType });
        await api.uploadPhoto(
          item.sessionId,
          blob,
          item.stepIndex,
          item.criteria ?? undefined,
          item.id,
        );
        await photoQueueStorage.remove(item.id);
        void queryClient.invalidateQueries({ queryKey: ['session', item.sessionId] });
      }
    } finally {
      setIsSyncing(false);
      await refreshCount();
    }
  }, [isSyncing, queryClient, refreshCount]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    const handleOnline = () => {
      void processQueue();
    };

    window.addEventListener('online', handleOnline);
    void processQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [processQueue]);

  return {
    pendingCount,
    isSyncing,
    processQueue,
  };
}

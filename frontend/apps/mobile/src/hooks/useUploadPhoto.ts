import { getApiClient } from '@superion/api-client';
import { getEnv } from '@superion/config';
import type { PhotoUploadResponse } from '@superion/domain';
import { getWsClient } from '@superion/ws-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { photoQueueStorage } from '../services/photo_queue';
import { addAcceptedPhotoStep, type PhotoValidationUiStatus } from './photo_state';

export interface UploadPhotoInput {
  file: Blob;
  stepIndex: number;
  criteria?: string;
  fileName?: string;
  mimeType?: string;
}

export interface PhotoValidationState {
  status: PhotoValidationUiStatus;
  feedback: string | null;
  retries: number;
  maxRetries: number;
  photoId: string | null;
}

const initialValidationState: PhotoValidationState = {
  status: 'idle',
  feedback: null,
  retries: 0,
  maxRetries: getEnv().VITE_PHOTO_MAX_RETRIES,
  photoId: null,
};

export function useUploadPhoto(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const [validationState, setValidationState] =
    useState<PhotoValidationState>(initialValidationState);
  const pendingPhotoIdRef = useRef<string | null>(null);

  const resetValidation = useCallback(() => {
    pendingPhotoIdRef.current = null;
    setValidationState(initialValidationState);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const ws = getWsClient();
    const unsubscribe = ws.subscribe('photo.*', (event) => {
      if (!isRecord(event.payload)) {
        return;
      }

      const photoId = typeof event.payload.photo_id === 'string' ? event.payload.photo_id : null;
      if (!photoId || photoId !== pendingPhotoIdRef.current) {
        return;
      }

      if (event.type === 'photo.validated') {
        const stepIndex =
          typeof event.payload.step_index === 'number' ? event.payload.step_index : -1;
        if (stepIndex >= 0) {
          addAcceptedPhotoStep(queryClient, sessionId, stepIndex);
        }
        setValidationState((current) => ({
          ...current,
          status: 'accepted',
          photoId,
        }));
        void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
        return;
      }

      if (event.type === 'photo.rejected') {
        const feedback =
          typeof event.payload.feedback === 'string' ? event.payload.feedback : null;
        const retries = typeof event.payload.retries === 'number' ? event.payload.retries : 0;
        const maxRetries =
          typeof event.payload.max_retries === 'number'
            ? event.payload.max_retries
            : getEnv().VITE_PHOTO_MAX_RETRIES;

        setValidationState({
          status: retries >= maxRetries ? 'escalated' : 'rejected',
          feedback,
          retries,
          maxRetries,
          photoId,
        });
      }
    });

    return unsubscribe;
  }, [queryClient, sessionId]);

  const mutation = useMutation({
    mutationFn: async (input: UploadPhotoInput): Promise<PhotoUploadResponse | null> => {
      if (!sessionId) {
        throw new Error('sessionId requerido');
      }

      const maxBytes = getEnv().VITE_PHOTO_MAX_SIZE_MB * 1024 * 1024;
      if (input.file.size > maxBytes) {
        throw new Error('La foto supera el tamaño máximo permitido');
      }

      if (!navigator.onLine) {
        const queueId = crypto.randomUUID();
        const fileData = await input.file.arrayBuffer();
        await photoQueueStorage.add({
          id: queueId,
          sessionId,
          stepIndex: input.stepIndex,
          criteria: input.criteria ?? null,
          fileData,
          fileName: input.fileName ?? 'photo.jpg',
          mimeType: (input.mimeType ?? input.file.type) || 'image/jpeg',
          createdAt: new Date().toISOString(),
        });
        setValidationState((current) => ({
          ...current,
          status: 'queued',
        }));
        return null;
      }

      setValidationState((current) => ({
        ...current,
        status: 'validating',
        feedback: null,
      }));

      const api = getApiClient();
      const response = await api.uploadPhoto(
        sessionId,
        input.file,
        input.stepIndex,
        input.criteria,
        crypto.randomUUID(),
      );

      pendingPhotoIdRef.current = response.photoId;
      setValidationState((current) => ({
        ...current,
        status: 'validating',
        photoId: response.photoId,
      }));

      return response;
    },
  });

  return {
    uploadPhoto: mutation,
    validationState,
    resetValidation,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

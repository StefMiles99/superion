import type { QueryClient } from '@tanstack/react-query';

export type PhotoValidationUiStatus =
  | 'idle'
  | 'validating'
  | 'accepted'
  | 'rejected'
  | 'escalated'
  | 'queued';

export function acceptedPhotosQueryKey(sessionId: string) {
  return ['session', sessionId, 'acceptedPhotos'] as const;
}

export function getAcceptedPhotoSteps(
  queryClient: QueryClient,
  sessionId: string,
): Set<number> {
  return queryClient.getQueryData<Set<number>>(acceptedPhotosQueryKey(sessionId)) ?? new Set();
}

export function isStepPhotoAccepted(
  queryClient: QueryClient,
  sessionId: string,
  stepIndex: number,
): boolean {
  return getAcceptedPhotoSteps(queryClient, sessionId).has(stepIndex);
}

export function addAcceptedPhotoStep(
  queryClient: QueryClient,
  sessionId: string,
  stepIndex: number,
): void {
  const current = getAcceptedPhotoSteps(queryClient, sessionId);
  const next = new Set(current);
  next.add(stepIndex);
  queryClient.setQueryData(acceptedPhotosQueryKey(sessionId), next);
}

export function setStepThumbnail(
  queryClient: QueryClient,
  sessionId: string,
  stepIndex: number,
  thumbnailUrl: string,
): void {
  queryClient.setQueryData(['session', sessionId, 'photoThumbnails', stepIndex], thumbnailUrl);
}

export function getStepThumbnail(
  queryClient: QueryClient,
  sessionId: string,
  stepIndex: number,
): string | null {
  return (
    queryClient.getQueryData<string>(['session', sessionId, 'photoThumbnails', stepIndex]) ?? null
  );
}

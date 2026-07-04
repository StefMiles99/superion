import type { PhotoValidationUiStatus } from '../hooks/photo_state';
import { useTranslation } from 'react-i18next';

import { Button } from '@superion/ui';

interface PhotoValidationOverlayProps {
  status: PhotoValidationUiStatus;
  feedback?: string | null;
  retries?: number;
  maxRetries?: number;
  onRetake?: () => void;
}

export function PhotoValidationOverlay({
  status,
  feedback = null,
  retries = 0,
  maxRetries = 3,
  onRetake,
}: PhotoValidationOverlayProps) {
  const { t } = useTranslation();

  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-[hsl(222_47%_6%/0.88)] p-4"
      data-testid="photo-validation-overlay"
      aria-live={status === 'rejected' || status === 'escalated' ? 'assertive' : 'polite'}
      role="status"
    >
      <div className="w-full max-w-md space-y-4 rounded-xl border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_8%)] p-5 text-center">
          {status === 'validating' ? (
            <>
              <div
                className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[hsl(217_91%_60%)] border-t-transparent"
                aria-hidden="true"
              />
              <p className="text-lg font-medium">{t('photo.validating')}</p>
            </>
          ) : null}

          {status === 'accepted' ? (
            <p className="text-lg font-semibold text-[hsl(142_71%_45%)]">{t('photo.accepted')}</p>
          ) : null}

          {status === 'queued' ? (
            <p className="text-lg font-medium text-[hsl(45_93%_58%)]">{t('photo.syncing')}</p>
          ) : null}

          {status === 'rejected' ? (
            <>
              <p className="rounded-lg border border-[hsl(0_84%_60%/0.4)] bg-[hsl(0_84%_60%/0.1)] p-3 text-sm text-[hsl(0_84%_70%)]">
                {feedback ?? t('photo.rejectedGeneric')}
              </p>
              <p className="text-sm text-[hsl(215_20%_75%)]">
                {t('photo.retryCount', { current: retries, max: maxRetries })}
              </p>
              {onRetake ? (
                <Button type="button" className="min-h-12 w-full" onClick={onRetake}>
                  {t('photo.retake')}
                </Button>
              ) : null}
            </>
          ) : null}

          {status === 'escalated' ? (
            <>
              <p className="rounded-lg border border-[hsl(0_84%_60%/0.4)] bg-[hsl(0_84%_60%/0.1)] p-3 text-sm text-[hsl(0_84%_70%)]">
                {t('photo.escalated')}
              </p>
              {feedback ? (
                <p className="text-sm text-[hsl(215_20%_75%)]">{feedback}</p>
              ) : null}
              {onRetake ? (
                <Button type="button" variant="secondary" className="min-h-12 w-full" onClick={onRetake}>
                  {t('photo.retake')}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
    </div>
  );
}

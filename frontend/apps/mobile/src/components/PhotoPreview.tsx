import { useTranslation } from 'react-i18next';

import { Button } from '@superion/ui';

interface PhotoPreviewProps {
  previewUrl: string;
  onRetake: () => void;
  onSend: () => void;
  isSending: boolean;
  showActions?: boolean;
}

export function PhotoPreview({
  previewUrl,
  onRetake,
  onSend,
  isSending,
  showActions = true,
}: PhotoPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col gap-4" data-testid="photo-preview">
      <img
        src={previewUrl}
        alt={t('photo.previewAlt')}
        className="max-h-[55vh] w-full rounded-xl object-contain"
      />
      {showActions ? (
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="secondary"
            className="min-h-14 text-base"
            onClick={onRetake}
            disabled={isSending}
          >
            {t('photo.retake')}
          </Button>
          <Button
            type="button"
            className="min-h-14 text-base"
            onClick={onSend}
            disabled={isSending}
            aria-busy={isSending}
          >
            {t('photo.send')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

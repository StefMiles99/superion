import type { WsConnectionState } from '@superion/domain';
import { Button } from '@superion/ui';
import { useTranslation } from 'react-i18next';

interface ConnectionBannerProps {
  connectionState: WsConnectionState;
  showRetryCta?: boolean;
  onRetry?: () => void;
}

export function ConnectionBanner({
  connectionState,
  showRetryCta = false,
  onRetry,
}: ConnectionBannerProps) {
  const { t } = useTranslation();

  if (connectionState === 'open' || connectionState === 'connecting') {
    return null;
  }

  const message =
    connectionState === 'reconnecting'
      ? t('session.connection.reconnecting')
      : t('session.connection.disconnected');

  return (
    <div
      data-testid="connection-banner"
      role="status"
      aria-live="assertive"
      className="mx-4 mt-4 rounded-lg border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.12)] p-3 text-sm text-[hsl(38_92%_70%)]"
    >
      <p>{message}</p>
      {showRetryCta && onRetry ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-3 min-h-10 w-full"
          onClick={onRetry}
        >
          {t('session.connection.retry')}
        </Button>
      ) : null}
    </div>
  );
}

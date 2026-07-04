import { Button } from '@superion/ui';

interface ErrorBannerProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, retryLabel, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="work-orders-error"
      className="rounded-lg border border-[hsl(0_84%_60%/0.4)] bg-[hsl(0_84%_60%/0.1)] p-4"
    >
      <p className="mb-3 text-sm text-[hsl(0_84%_70%)]">{message}</p>
      <Button type="button" variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

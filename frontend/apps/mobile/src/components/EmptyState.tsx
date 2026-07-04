import type { ReactNode } from 'react';

import { Button } from '@superion/ui';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center"
      data-testid="work-orders-empty"
    >
      {icon ? <div aria-hidden="true">{icon}</div> : null}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[hsl(210_40%_98%)]">{title}</h2>
        <p className="text-sm text-[hsl(215_20%_65%)]">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button type="button" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

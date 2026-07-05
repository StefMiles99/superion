import type { SessionStatus } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { cn } from '@superion/ui';

interface StatusDotProps {
  status: SessionStatus;
  className?: string;
}

const STATUS_CLASS: Record<SessionStatus, string> = {
  active: 'bg-[hsl(142_71%_45%)]',
  paused: 'bg-[hsl(45_93%_47%)]',
  finalized: 'bg-[hsl(215_20%_45%)]',
  aborted: 'bg-[hsl(0_84%_60%)]',
};

export function StatusDot({ status, className }: StatusDotProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', STATUS_CLASS[status], className)}
      aria-label={t(`dashboard.status.${status}`)}
      title={t(`dashboard.status.${status}`)}
    />
  );
}

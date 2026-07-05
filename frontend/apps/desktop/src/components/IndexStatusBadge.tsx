import type { IndexStatus, ManualStatus } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { cn } from '@superion/ui';

interface IndexStatusBadgeProps {
  indexStatus: IndexStatus;
  status: ManualStatus;
  className?: string;
}

const INDEX_TONE: Record<IndexStatus, string> = {
  indexed: 'bg-[hsl(142_71%_45%_/0.15)] text-[hsl(142_71%_55%)]',
  pending: 'bg-[hsl(45_93%_47%_/0.15)] text-[hsl(45_93%_57%)]',
  failed: 'bg-[hsl(0_84%_60%_/0.15)] text-[hsl(0_84%_70%)]',
};

export function IndexStatusBadge({ indexStatus, status, className }: IndexStatusBadgeProps) {
  const { t } = useTranslation();

  const label =
    status === 'archived'
      ? t('manuals.status.archived')
      : status === 'indexing' || indexStatus === 'pending'
        ? t('manuals.status.indexing')
        : indexStatus === 'indexed'
          ? t('manuals.status.indexed')
          : indexStatus === 'failed'
            ? t('manuals.status.failed')
            : t(`manuals.status.${status}`, { defaultValue: status });

  const tone =
    status === 'archived'
      ? 'bg-[hsl(215_20%_65%_/0.15)] text-[hsl(215_20%_75%)]'
      : INDEX_TONE[indexStatus];

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        tone,
        className,
      )}
      data-testid="index-status-badge"
    >
      {label}
    </span>
  );
}

import type { WorkOrderStatus } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { cn } from '@superion/ui';

interface StatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
}

const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  pending: 'bg-[hsl(45_93%_47%/0.2)] text-[hsl(45_93%_60%)]',
  in_progress: 'bg-[hsl(217_91%_60%/0.2)] text-[hsl(217_91%_70%)]',
  paused: 'bg-[hsl(215_20%_65%/0.2)] text-[hsl(215_20%_75%)]',
  completed: 'bg-[hsl(142_71%_45%/0.2)] text-[hsl(142_71%_55%)]',
  cancelled: 'bg-[hsl(0_84%_60%/0.2)] text-[hsl(0_84%_70%)]',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className,
      )}
    >
      {t(`workOrders.status.${status}`)}
    </span>
  );
}

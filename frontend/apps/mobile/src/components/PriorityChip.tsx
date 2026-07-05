import type { WorkOrderPriority } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { cn } from '@superion/ui';

interface PriorityChipProps {
  priority: WorkOrderPriority;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

const PRIORITY_STYLES: Record<WorkOrderPriority, string> = {
  low: 'border-[hsl(142_71%_45%)] text-[hsl(142_71%_55%)]',
  med: 'border-[hsl(45_93%_47%)] text-[hsl(45_93%_60%)]',
  high: 'border-[hsl(0_84%_60%)] text-[hsl(0_84%_70%)]',
};

export function PriorityChip({
  priority,
  selected = false,
  onClick,
  className,
}: PriorityChipProps) {
  const { t } = useTranslation();

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      aria-pressed={onClick ? selected : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border px-3 text-xs font-medium',
        PRIORITY_STYLES[priority],
        selected && 'bg-[hsl(217_33%_17%)]',
        onClick &&
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(217_91%_60%)]',
        className,
      )}
    >
      {t(`workOrders.priority.${priority}`)}
    </Component>
  );
}

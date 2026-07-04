import type { WorkOrder } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { Card } from '@superion/ui';

import { PriorityChip } from './PriorityChip';
import { StatusBadge } from './StatusBadge';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
}

export function WorkOrderCard({ workOrder }: WorkOrderCardProps) {
  const { t } = useTranslation();

  const plannedLabel = t('workOrders.card.estimatedMinutes', {
    minutes: workOrder.estimatedMinutes,
  });

  return (
    <Card
      data-testid={`work-order-card-${workOrder.code}`}
      className="min-h-12 cursor-default p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-base font-semibold">{workOrder.code}</p>
          <p className="truncate text-sm text-[hsl(215_20%_65%)]">
            {workOrder.asset.name} · {workOrder.asset.tag}
          </p>
          <p className="truncate text-sm text-[hsl(215_20%_65%)]">{workOrder.procedureName}</p>
        </div>
        <StatusBadge status={workOrder.status} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <PriorityChip priority={workOrder.priority} />
        <span className="text-xs text-[hsl(215_20%_65%)]">{plannedLabel}</span>
      </div>
    </Card>
  );
}

import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import type { WorkOrder } from '@superion/domain';
import { Card } from '@superion/ui';

import { PriorityChip } from './PriorityChip';
import { StatusBadge } from './StatusBadge';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onSelect?: (workOrder: WorkOrder) => void;
}

export function WorkOrderCard({ workOrder, onSelect }: WorkOrderCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const plannedLabel = t('workOrders.card.estimatedMinutes', {
    minutes: workOrder.estimatedMinutes,
  });

  const handleClick = () => {
    if (onSelect) {
      onSelect(workOrder);
      return;
    }
    navigate(`/work-orders/${workOrder.id}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <Card
      data-testid={`work-order-card-${workOrder.code}`}
      role="button"
      tabIndex={0}
      className="min-h-12 cursor-pointer p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(217_91%_60%)]"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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

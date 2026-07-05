import type { WorkOrderPriority, WorkOrderStatus } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { Input } from '@superion/ui';

import { PriorityChip } from './PriorityChip';

interface FilterBarProps {
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  query: string;
  onStatusChange: (status: WorkOrderStatus | undefined) => void;
  onPriorityChange: (priority: WorkOrderPriority | undefined) => void;
  onQueryChange: (query: string) => void;
}

const STATUS_TABS: Array<{ value: WorkOrderStatus | undefined; labelKey: string }> = [
  { value: undefined, labelKey: 'workOrders.filters.all' },
  { value: 'pending', labelKey: 'workOrders.filters.pending' },
  { value: 'in_progress', labelKey: 'workOrders.filters.inProgress' },
  { value: 'completed', labelKey: 'workOrders.filters.completed' },
];

const PRIORITY_OPTIONS: WorkOrderPriority[] = ['low', 'med', 'high'];

export function FilterBar({
  status,
  priority,
  query,
  onStatusChange,
  onPriorityChange,
  onQueryChange,
}: FilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4" data-testid="work-orders-filter-bar">
      <Input
        name="search"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={t('workOrders.filters.searchPlaceholder')}
        aria-label={t('workOrders.filters.searchPlaceholder')}
      />

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label={t('workOrders.filters.statusLabel')}
      >
        {STATUS_TABS.map((tab) => {
          const selected = status === tab.value;
          return (
            <button
              key={tab.labelKey}
              type="button"
              aria-pressed={selected}
              onClick={() => onStatusChange(tab.value)}
              className={`inline-flex min-h-12 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(217_91%_60%)] ${
                selected
                  ? 'bg-[hsl(217_91%_60%)] text-[hsl(222_47%_6%)]'
                  : 'bg-[hsl(217_33%_17%)] text-[hsl(210_40%_98%)]'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2" aria-label={t('workOrders.filters.priorityLabel')}>
        {PRIORITY_OPTIONS.map((option) => (
          <PriorityChip
            key={option}
            priority={option}
            selected={priority === option}
            onClick={() => onPriorityChange(priority === option ? undefined : option)}
          />
        ))}
      </div>
    </div>
  );
}

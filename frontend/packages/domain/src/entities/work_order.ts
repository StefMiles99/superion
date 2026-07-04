export type WorkOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type WorkOrderPriority = 'low' | 'med' | 'high';

export interface WorkOrderAsset {
  id: string;
  tag: string;
  name: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  procedureName: string;
  estimatedMinutes: number;
  asset: WorkOrderAsset;
}

export interface WorkOrderFilter {
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  q?: string;
  cursor?: string;
  limit?: number;
}

const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'pending',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
];

const WORK_ORDER_PRIORITIES: WorkOrderPriority[] = ['low', 'med', 'high'];

export function isWorkOrderStatus(value: string): value is WorkOrderStatus {
  return WORK_ORDER_STATUSES.includes(value as WorkOrderStatus);
}

export function isWorkOrderPriority(value: string): value is WorkOrderPriority {
  return WORK_ORDER_PRIORITIES.includes(value as WorkOrderPriority);
}

export function parseWorkOrderFilterFromSearchParams(
  params: URLSearchParams,
): WorkOrderFilter {
  const filter: WorkOrderFilter = {};

  const status = params.get('status');
  if (status && isWorkOrderStatus(status)) {
    filter.status = status;
  }

  const priority = params.get('priority');
  if (priority && isWorkOrderPriority(priority)) {
    filter.priority = priority;
  }

  const q = params.get('q')?.trim();
  if (q) {
    filter.q = q;
  }

  const cursor = params.get('cursor')?.trim();
  if (cursor) {
    filter.cursor = cursor;
  }

  const limitRaw = params.get('limit');
  if (limitRaw) {
    const limit = Number.parseInt(limitRaw, 10);
    if (Number.isFinite(limit) && limit > 0) {
      filter.limit = limit;
    }
  }

  return filter;
}

export function serializeWorkOrderFilterToSearchParams(
  filter: WorkOrderFilter,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filter.status) {
    params.set('status', filter.status);
  }
  if (filter.priority) {
    params.set('priority', filter.priority);
  }
  if (filter.q) {
    params.set('q', filter.q);
  }
  if (filter.cursor) {
    params.set('cursor', filter.cursor);
  }
  if (filter.limit !== undefined) {
    params.set('limit', String(filter.limit));
  }

  return params;
}

export function matchesWorkOrderFilter(
  workOrder: WorkOrder,
  filter: WorkOrderFilter,
): boolean {
  if (filter.status && workOrder.status !== filter.status) {
    return false;
  }

  if (filter.priority && workOrder.priority !== filter.priority) {
    return false;
  }

  if (filter.q) {
    const needle = filter.q.toLowerCase();
    const matchesCode = workOrder.code.toLowerCase().includes(needle);
    const matchesTag = workOrder.asset.tag.toLowerCase().includes(needle);
    if (!matchesCode && !matchesTag) {
      return false;
    }
  }

  return true;
}

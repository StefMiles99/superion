export type WorkOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type WorkOrderPriority = 'low' | 'med' | 'high';

export interface WorkOrder {
  id: string;
  code: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  procedureName: string;
  estimatedMinutes: number;
}

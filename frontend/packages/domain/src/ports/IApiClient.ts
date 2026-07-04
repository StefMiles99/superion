import type { User } from '../entities/user';
import type { WorkOrder } from '../entities/work_order';

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface IApiClient {
  getCurrentUser(): Promise<User>;
  listWorkOrders(): Promise<Paginated<WorkOrder>>;
  healthCheck(): Promise<{ status: string }>;
  reset?(): void;
}

import type { IApiClient, Paginated } from '@superion/domain';
import type { User } from '@superion/domain';
import type { WorkOrder } from '@superion/domain';

const FIXTURE_USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'juan@planta.com',
  fullName: 'Juan Pérez',
  role: 'technician',
  plantId: '660e8400-e29b-41d4-a716-446655440001',
};

const FIXTURE_WORK_ORDERS: WorkOrder[] = [
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    code: 'OT-1234',
    status: 'pending',
    priority: 'high',
    procedureName: 'MP-Compresor-C3-v3',
    estimatedMinutes: 90,
  },
];

export class InMemoryApiClient implements IApiClient {
  private user: User = { ...FIXTURE_USER };
  private workOrders: WorkOrder[] = FIXTURE_WORK_ORDERS.map((wo) => ({ ...wo }));

  async getCurrentUser(): Promise<User> {
    return { ...this.user };
  }

  async listWorkOrders(): Promise<Paginated<WorkOrder>> {
    return {
      items: this.workOrders.map((wo) => ({ ...wo })),
      nextCursor: null,
    };
  }

  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  reset(): void {
    this.user = { ...FIXTURE_USER };
    this.workOrders = FIXTURE_WORK_ORDERS.map((wo) => ({ ...wo }));
  }
}

import type { IApiClient, Paginated } from '@superion/domain';
import type { User } from '@superion/domain';
import type { WorkOrder } from '@superion/domain';

import { NotImplementedError } from './errors';

export class HttpApiClient implements IApiClient {
  constructor(private readonly baseUrl: string) {}

  async getCurrentUser(): Promise<User> {
    throw new NotImplementedError(
      `HttpApiClient.getCurrentUser no implementado (${this.baseUrl})`,
    );
  }

  async listWorkOrders(): Promise<Paginated<WorkOrder>> {
    throw new NotImplementedError(
      `HttpApiClient.listWorkOrders no implementado (${this.baseUrl})`,
    );
  }

  async healthCheck(): Promise<{ status: string }> {
    throw new NotImplementedError(
      `HttpApiClient.healthCheck no implementado (${this.baseUrl})`,
    );
  }
}

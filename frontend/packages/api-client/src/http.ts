import type {
  LoginInput,
  LoginResponse,
  RefreshInput,
} from '@superion/domain';
import { AuthError } from '@superion/domain';
import type { IApiClient, Paginated } from '@superion/domain';
import type { Role, User } from '@superion/domain';
import type { WorkOrder, WorkOrderFilter } from '@superion/domain';

import { ApiError, NotImplementedError } from './errors';

interface AuthApiUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  plant_id: string;
}

interface AuthApiResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthApiUser;
}

interface MeApiResponse {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  plant_id: string;
}

interface WorkOrdersApiResponse {
  items: Array<{
    id: string;
    code: string;
    status: WorkOrder['status'];
    priority: WorkOrder['priority'];
    procedure_name: string;
    estimated_minutes: number;
    asset: {
      id: string;
      tag: string;
      name: string;
    };
  }>;
  next_cursor: string | null;
}

function buildWorkOrdersQuery(filter: WorkOrderFilter = {}): string {
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

  const query = params.toString();
  return query ? `?${query}` : '';
}

function mapUser(apiUser: AuthApiUser | MeApiResponse): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    fullName: apiUser.full_name,
    role: apiUser.role,
    plantId: apiUser.plant_id,
  };
}

function mapLoginResponse(data: AuthApiResponse): LoginResponse {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: mapUser(data.user),
  };
}

export class HttpApiClient implements IApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<LoginResponse> | null = null;

  constructor(private readonly baseUrl: string) {}

  setTokens(accessToken: string | null, refreshToken?: string | null): void {
    this.accessToken = accessToken;
    if (refreshToken !== undefined) {
      this.refreshToken = refreshToken;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retried = false,
  ): Promise<T> {
    const headers = new Headers(options.headers);

    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    if (
      options.method &&
      options.method !== 'GET' &&
      options.method !== 'HEAD' &&
      !headers.has('Idempotency-Key')
    ) {
      headers.set('Idempotency-Key', crypto.randomUUID());
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401 && !retried && this.refreshToken) {
      await this.performRefresh();
      return this.request<T>(path, options, true);
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401) {
        throw new AuthError(body || 'No autenticado');
      }
      throw new ApiError(`HTTP ${String(response.status)}: ${body}`, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async performRefresh(): Promise<LoginResponse> {
    if (!this.refreshToken) {
      throw new AuthError('No hay refresh token');
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh({ refreshToken: this.refreshToken }).finally(
        () => {
          this.refreshPromise = null;
        },
      );
    }

    return this.refreshPromise;
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const data = await this.request<AuthApiResponse>('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.email, password: input.password }),
    });

    const mapped = mapLoginResponse(data);
    this.setTokens(mapped.accessToken, mapped.refreshToken);
    return mapped;
  }

  async refresh(input: RefreshInput): Promise<LoginResponse> {
    const data = await this.request<AuthApiResponse>('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: input.refreshToken }),
    });

    const mapped = mapLoginResponse(data);
    this.setTokens(mapped.accessToken, mapped.refreshToken);
    return mapped;
  }

  async logout(): Promise<void> {
    await this.request<void>('/v1/auth/logout', { method: 'POST' });
    this.setTokens(null, null);
  }

  async me(): Promise<User> {
    const data = await this.request<MeApiResponse>('/v1/auth/me');
    return mapUser(data);
  }

  async listWorkOrders(filter: WorkOrderFilter = {}): Promise<Paginated<WorkOrder>> {
    const data = await this.request<WorkOrdersApiResponse>(
      `/v1/work-orders${buildWorkOrdersQuery(filter)}`,
    );

    return {
      items: data.items.map((item) => ({
        id: item.id,
        code: item.code,
        status: item.status,
        priority: item.priority,
        procedureName: item.procedure_name,
        estimatedMinutes: item.estimated_minutes,
        asset: {
          id: item.asset.id,
          tag: item.asset.tag,
          name: item.asset.name,
        },
      })),
      nextCursor: data.next_cursor,
    };
  }

  async listActiveSessions(_plantId: string): Promise<import('@superion/domain').SessionSummary[]> {
    throw new NotImplementedError('HttpApiClient.listActiveSessions — implementar en FE-09+');
  }

  async getWorkOrder(_id: string): Promise<import('@superion/domain').WorkOrderDetail> {
    throw new NotImplementedError('HttpApiClient.getWorkOrder — implementar en FE-03+');
  }

  async addSessionNote(_sessionId: string, _note: string): Promise<void> {
    throw new NotImplementedError('HttpApiClient.addSessionNote — implementar en FE-09+');
  }

  async forceAdvance(_sessionId: string, _stepIndex: number): Promise<void> {
    throw new NotImplementedError('HttpApiClient.forceAdvance — implementar en FE-10+');
  }

  async listSessionEvents(_sessionId: string): Promise<import('@superion/domain').WsEvent[]> {
    throw new NotImplementedError('HttpApiClient.listSessionEvents — implementar en FE-10+');
  }

  async startSession(_workOrderId: string): Promise<import('@superion/domain').SessionStart> {
    throw new NotImplementedError('HttpApiClient.startSession — implementar en FE-03+');
  }

  async getSession(_id: string): Promise<import('@superion/domain').Session> {
    throw new NotImplementedError('HttpApiClient.getSession — implementar en FE-03+');
  }

  async postSessionEvent(
    _sessionId: string,
    _event: import('@superion/domain').SessionEventInput,
  ): Promise<import('@superion/domain').SessionEventResponse> {
    throw new NotImplementedError('HttpApiClient.postSessionEvent — implementar en FE-03+');
  }

  async pauseSession(_sessionId: string): Promise<void> {
    throw new NotImplementedError('HttpApiClient.pauseSession — implementar en FE-03+');
  }

  async resumeSession(_sessionId: string): Promise<void> {
    throw new NotImplementedError('HttpApiClient.resumeSession — implementar en FE-03+');
  }

  async askAssistant(_sessionId: string, _question: string): Promise<import('@superion/domain').AssistantAnswer> {
    throw new NotImplementedError('HttpApiClient.askAssistant — implementar en FE-06+');
  }

  async uploadPhoto(
    _sessionId: string,
    _file: Blob,
    _stepIndex: number,
    _criteria?: string,
    _eventId?: string,
  ): Promise<import('@superion/domain').PhotoUploadResponse> {
    throw new NotImplementedError('HttpApiClient.uploadPhoto — implementar en FE-07+');
  }

  async getReport(_sessionId: string): Promise<import('@superion/domain').MaintenanceReport> {
    throw new NotImplementedError('HttpApiClient.getReport — implementar en FE-08+');
  }

  async getReportPdf(_sessionId: string): Promise<Blob> {
    throw new NotImplementedError('HttpApiClient.getReportPdf — implementar en FE-08+');
  }

  async finalizeSession(
    _sessionId: string,
  ): Promise<import('@superion/domain').FinalizeSessionResponse> {
    throw new NotImplementedError('HttpApiClient.finalizeSession — implementar en FE-08+');
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

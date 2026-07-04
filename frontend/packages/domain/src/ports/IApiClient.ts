import type { LoginInput, LoginResponse, RefreshInput } from '../entities/auth';
import type { User } from '../entities/user';
import type { WorkOrder } from '../entities/work_order';

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface IApiClient {
  login(input: LoginInput): Promise<LoginResponse>;
  refresh(input: RefreshInput): Promise<LoginResponse>;
  logout(): Promise<void>;
  me(): Promise<User>;
  listWorkOrders(): Promise<Paginated<WorkOrder>>;
  healthCheck(): Promise<{ status: string }>;
  setTokens?(accessToken: string | null, refreshToken?: string | null): void;
  reset?(): void;
}

import type { AssistantAnswer } from '../entities/assistant';
import type { LoginInput, LoginResponse, RefreshInput } from '../entities/auth';
import type {
  Session,
  SessionEventInput,
  SessionEventResponse,
  SessionStart,
} from '../entities/session';
import type { User } from '../entities/user';
import type { WorkOrder, WorkOrderDetail, WorkOrderFilter } from '../entities/work_order';

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface IApiClient {
  login(input: LoginInput): Promise<LoginResponse>;
  refresh(input: RefreshInput): Promise<LoginResponse>;
  logout(): Promise<void>;
  me(): Promise<User>;
  listWorkOrders(filter?: WorkOrderFilter): Promise<Paginated<WorkOrder>>;
  getWorkOrder(id: string): Promise<WorkOrderDetail>;
  startSession(workOrderId: string): Promise<SessionStart>;
  getSession(id: string): Promise<Session>;
  postSessionEvent(
    sessionId: string,
    event: SessionEventInput,
  ): Promise<SessionEventResponse>;
  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
  askAssistant(sessionId: string, question: string): Promise<AssistantAnswer>;
  healthCheck(): Promise<{ status: string }>;
  setTokens?(accessToken: string | null, refreshToken?: string | null): void;
  reset?(): void;
}

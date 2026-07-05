import type { AssistantAnswer } from '../entities/assistant';
import type { LoginInput, LoginResponse, RefreshInput } from '../entities/auth';
import type { PhotoUploadResponse } from '../entities/photo';
import type { FinalizeSessionResponse, MaintenanceReport } from '../entities/report';
import type {
  Session,
  SessionEventInput,
  SessionEventResponse,
  SessionStart,
  SessionSummary,
} from '../entities/session';
import type {
  Manual,
  ManualDetail,
  ManualReindexResponse,
  ManualSearchResponse,
  ManualUploadInput,
  ManualUploadResponse,
} from '../entities/manual';
import type {
  CreateProcedureTemplateInput,
  ProcedureTemplate,
  ProcedureTemplateListItem,
  UpdateProcedureTemplateInput,
} from '../entities/procedure_template';
import type { User } from '../entities/user';
import type { WorkOrder, WorkOrderDetail, WorkOrderFilter } from '../entities/work_order';
import type { WsEvent } from './IWsClient';

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
  listActiveSessions(plantId: string): Promise<SessionSummary[]>;
  getWorkOrder(id: string): Promise<WorkOrderDetail>;
  addSessionNote?(sessionId: string, note: string): Promise<void>;
  forceAdvance?(sessionId: string, stepIndex: number): Promise<void>;
  listSessionEvents?(sessionId: string): Promise<WsEvent[]>;
  startSession(workOrderId: string): Promise<SessionStart>;
  getSession(id: string): Promise<Session>;
  postSessionEvent(
    sessionId: string,
    event: SessionEventInput,
  ): Promise<SessionEventResponse>;
  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
  askAssistant(sessionId: string, question: string): Promise<AssistantAnswer>;
  uploadPhoto(
    sessionId: string,
    file: Blob,
    stepIndex: number,
    criteria?: string,
    eventId?: string,
  ): Promise<PhotoUploadResponse>;
  getReport(sessionId: string): Promise<MaintenanceReport>;
  getReportPdf(sessionId: string): Promise<Blob>;
  finalizeSession(sessionId: string): Promise<FinalizeSessionResponse>;
  listManuals(): Promise<{ items: Manual[] }>;
  getManual(id: string): Promise<ManualDetail>;
  uploadManual(input: ManualUploadInput): Promise<ManualUploadResponse>;
  reindexManual(id: string): Promise<ManualReindexResponse>;
  archiveManual(id: string): Promise<void>;
  searchManual(id: string, query: string): Promise<ManualSearchResponse>;
  listProcedureTemplates(): Promise<Paginated<ProcedureTemplateListItem>>;
  getProcedureTemplate(id: string): Promise<ProcedureTemplate>;
  createProcedureTemplate(input: CreateProcedureTemplateInput): Promise<ProcedureTemplate>;
  updateProcedureTemplate(
    id: string,
    input: UpdateProcedureTemplateInput,
  ): Promise<ProcedureTemplate>;
  archiveProcedureTemplate(id: string): Promise<void>;
  healthCheck(): Promise<{ status: string }>;
  setTokens?(accessToken: string | null, refreshToken?: string | null): void;
  reset?(): void;
}

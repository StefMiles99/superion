import type {
  AuthSession,
  FinalizeResult,
  Paginated,
  PhotoUploadResult,
  Session,
  StartSessionResult,
  UploadPhotoCommand,
  UserProfile,
  VoiceConnect,
  WorkOrder,
  WorkOrderStatus,
} from "../entities";
import type {
  Manual,
  ManualUploadCommand,
  ManualUploadResult,
  ReindexResult,
} from "../manuals";
import type { MaintenanceReport, SessionEventItem, SessionListItem } from "../report";

/** Puerto de acceso REST. Impls: HttpApiClient (real) e InMemoryApiClient (mock). */
export interface IApiClient {
  // Auth
  login(email: string, password: string): Promise<AuthSession>;
  me(): Promise<UserProfile>;
  logout(): Promise<void>;

  // Work orders
  listWorkOrders(params?: { status?: WorkOrderStatus[] }): Promise<Paginated<WorkOrder>>;
  getWorkOrder(id: string): Promise<WorkOrder>;
  startSession(workOrderId: string): Promise<StartSessionResult>;

  // Sessions
  getSession(id: string): Promise<Session>;
  pauseSession(id: string): Promise<void>;
  resumeSession(id: string): Promise<void>;
  finalizeSession(id: string): Promise<FinalizeResult>;
  voiceConnect(id: string): Promise<VoiceConnect>;

  // Photos / reports
  uploadPhoto(sessionId: string, cmd: UploadPhotoCommand): Promise<PhotoUploadResult>;
  getReport(sessionId: string): Promise<MaintenanceReport>;
  listSessionEvents(
    sessionId: string,
    params?: { sinceSeq?: number; limit?: number },
  ): Promise<{ items: SessionEventItem[] }>;
  reportPdf(sessionId: string): Promise<Blob>;

  // Sessions (supervisor/desktop)
  listSessions(): Promise<{ items: SessionListItem[] }>;

  // Manuals (RAG) — dashboard admin/desktop
  listManuals(): Promise<{ items: Manual[] }>;
  getManual(id: string): Promise<Manual>;
  uploadManual(cmd: ManualUploadCommand): Promise<ManualUploadResult>;
  reindexManual(id: string): Promise<ReindexResult>;
  deleteManual(id: string): Promise<void>;
}

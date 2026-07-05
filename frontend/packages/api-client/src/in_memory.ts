import type {
  AuthSession,
  FinalizeResult,
  IApiClient,
  Manual,
  ManualUploadCommand,
  ManualUploadResult,
  Paginated,
  PhotoUploadResult,
  ReindexResult,
  Session,
  StartSessionResult,
  UploadPhotoCommand,
  UserProfile,
  VoiceConnect,
  WorkOrder,
  WorkOrderStatus,
} from "@superion/domain";
import { MockBackend } from "./mock/backend";

const tick = () => new Promise<void>((r) => setTimeout(r, 60));

/** Adaptador REST in-memory: delega en MockBackend. Sirve para dev/test sin backend. */
export class InMemoryApiClient implements IApiClient {
  constructor(private readonly backend: MockBackend = MockBackend.shared()) {}

  async login(email: string, password: string): Promise<AuthSession> {
    await tick();
    return this.backend.login(email, password);
  }

  async me(): Promise<UserProfile> {
    await tick();
    return this.backend.me();
  }

  async logout(): Promise<void> {
    await tick();
  }

  async listWorkOrders(params?: { status?: WorkOrderStatus[] }): Promise<Paginated<WorkOrder>> {
    await tick();
    return this.backend.listWorkOrders(params);
  }

  async getWorkOrder(id: string): Promise<WorkOrder> {
    await tick();
    return this.backend.getWorkOrder(id);
  }

  async startSession(workOrderId: string): Promise<StartSessionResult> {
    await tick();
    return this.backend.startSession(workOrderId);
  }

  async getSession(id: string): Promise<Session> {
    await tick();
    return this.backend.getSession(id);
  }

  async pauseSession(id: string): Promise<void> {
    await tick();
    this.backend.pauseSession(id);
  }

  async resumeSession(id: string): Promise<void> {
    await tick();
    this.backend.resumeSession(id);
  }

  async finalizeSession(id: string): Promise<FinalizeResult> {
    await tick();
    return this.backend.finalizeSession(id);
  }

  async voiceConnect(id: string): Promise<VoiceConnect> {
    await tick();
    return this.backend.voiceConnect(id);
  }

  async uploadPhoto(sessionId: string, cmd: UploadPhotoCommand): Promise<PhotoUploadResult> {
    await tick();
    return this.backend.uploadPhoto(sessionId, cmd);
  }

  async reportPdf(): Promise<Blob> {
    await tick();
    return this.backend.reportPdf();
  }

  async listManuals(): Promise<{ items: Manual[] }> {
    await tick();
    return this.backend.listManuals();
  }

  async getManual(id: string): Promise<Manual> {
    await tick();
    return this.backend.getManual(id);
  }

  async uploadManual(cmd: ManualUploadCommand): Promise<ManualUploadResult> {
    await tick();
    return this.backend.uploadManual(cmd);
  }

  async reindexManual(id: string): Promise<ReindexResult> {
    await tick();
    return this.backend.reindexManual(id);
  }

  async deleteManual(id: string): Promise<void> {
    await tick();
    this.backend.deleteManual(id);
  }
}

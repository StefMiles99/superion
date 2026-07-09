import {
  ApiError,
  type AuthSession,
  type FinalizeResult,
  type IApiClient,
  type IStorage,
  type MaintenanceReport,
  type Manual,
  type ManualUploadCommand,
  type ManualUploadResult,
  type Paginated,
  type PhotoUploadResult,
  type ReindexResult,
  type Session,
  type SessionEventItem,
  type SessionListItem,
  type StartSessionResult,
  type UploadPhotoCommand,
  type UserProfile,
  type VoiceConnect,
  type WorkOrder,
  type WorkOrderStatus,
} from "@superion/domain";
import { createTokenStore, type TokenStore } from "./token_store";

interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
  headers?: Record<string, string>;
  raw?: boolean;
  retry?: boolean;
}

/** Adaptador REST real contra el backend FastAPI. */
export class HttpApiClient implements IApiClient {
  private tokens: TokenStore;

  constructor(
    private readonly baseUrl: string,
    storage: IStorage,
  ) {
    this.tokens = createTokenStore(storage);
  }

  private async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { ...opts.headers };
    const access = this.tokens.getAccess();
    if (access) headers.Authorization = `Bearer ${access}`;

    let body: BodyInit | undefined;
    if (opts.form) {
      body = opts.form;
    } else if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body,
    });

    if (res.status === 401 && !opts.retry && this.tokens.getRefresh()) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request<T>(path, { ...opts, retry: true });
    }

    if (!res.ok) throw await this.toError(res);
    if (opts.raw) return res as unknown as T;
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async tryRefresh(): Promise<boolean> {
    const refresh = this.tokens.getRefresh();
    if (!refresh) return false;
    try {
      const res = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) {
        this.tokens.clear();
        return false;
      }
      const data = (await res.json()) as { access_token: string };
      this.tokens.setAccess(data.access_token);
      return true;
    } catch {
      return false;
    }
  }

  private async toError(res: Response): Promise<ApiError> {
    let code = "HTTP_ERROR";
    let message = res.statusText || "Error de red";
    let details: Record<string, unknown> | undefined;
    try {
      const data = (await res.json()) as {
        error?: { code?: string; message?: string; details?: Record<string, unknown> };
      };
      if (data.error) {
        code = data.error.code ?? code;
        message = data.error.message ?? message;
        details = data.error.details;
      }
    } catch {
      // respuesta sin cuerpo JSON
    }
    return new ApiError(res.status, code, message, details);
  }

  // ---- IApiClient ----

  async login(email: string, password: string): Promise<AuthSession> {
    const session = await this.request<AuthSession>("/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
    this.tokens.save(session);
    return session;
  }

  me(): Promise<UserProfile> {
    return this.request<UserProfile>("/v1/auth/me");
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>("/v1/auth/logout", { method: "POST", body: {} });
    } finally {
      this.tokens.clear();
    }
  }

  listWorkOrders(params?: { status?: WorkOrderStatus[] }): Promise<Paginated<WorkOrder>> {
    const qs = new URLSearchParams();
    params?.status?.forEach((s) => qs.append("status", s));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.request<Paginated<WorkOrder>>(`/v1/work-orders${suffix}`);
  }

  getWorkOrder(id: string): Promise<WorkOrder> {
    return this.request<WorkOrder>(`/v1/work-orders/${id}`);
  }

  startSession(workOrderId: string): Promise<StartSessionResult> {
    return this.request<StartSessionResult>(`/v1/work-orders/${workOrderId}/start`, {
      method: "POST",
      body: {},
    });
  }

  getSession(id: string): Promise<Session> {
    return this.request<Session>(`/v1/sessions/${id}`);
  }

  pauseSession(id: string): Promise<void> {
    return this.request<void>(`/v1/sessions/${id}/pause`, { method: "POST", body: {} });
  }

  resumeSession(id: string): Promise<void> {
    return this.request<void>(`/v1/sessions/${id}/resume`, { method: "POST", body: {} });
  }

  finalizeSession(id: string): Promise<FinalizeResult> {
    return this.request<FinalizeResult>(`/v1/sessions/${id}/finalize`, {
      method: "POST",
      body: {},
    });
  }

  getReport(sessionId: string): Promise<MaintenanceReport> {
    return this.request<MaintenanceReport>(`/v1/sessions/${sessionId}/report`);
  }

  listSessionEvents(
    sessionId: string,
    params?: { sinceSeq?: number; limit?: number },
  ): Promise<{ items: SessionEventItem[] }> {
    const qs = new URLSearchParams();
    if (params?.sinceSeq != null) qs.set("since_seq", String(params.sinceSeq));
    if (params?.limit != null) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.request<{ items: SessionEventItem[] }>(
      `/v1/sessions/${sessionId}/events${suffix}`,
    );
  }

  listSessions(): Promise<{ items: SessionListItem[] }> {
    return this.request<{ items: SessionListItem[] }>("/v1/sessions");
  }

  voiceConnect(id: string): Promise<VoiceConnect> {
    return this.request<VoiceConnect>(`/v1/sessions/${id}/voice/connect`, {
      method: "POST",
      body: {},
    });
  }

  uploadPhoto(sessionId: string, cmd: UploadPhotoCommand): Promise<PhotoUploadResult> {
    const form = new FormData();
    form.append("file", cmd.file, "evidence.jpg");
    form.append("step_index", String(cmd.stepIndex));
    form.append("event_id", cmd.eventId);
    if (cmd.criteria) form.append("criteria", cmd.criteria);
    return this.request<PhotoUploadResult>(`/v1/sessions/${sessionId}/photos`, {
      method: "POST",
      form,
    });
  }

  async reportPdf(sessionId: string): Promise<Blob> {
    const res = await this.request<Response>(`/v1/sessions/${sessionId}/report/pdf`, {
      raw: true,
    });
    return res.blob();
  }

  listManuals(): Promise<{ items: Manual[] }> {
    return this.request<{ items: Manual[] }>("/v1/manuals");
  }

  getManual(id: string): Promise<Manual> {
    return this.request<Manual>(`/v1/manuals/${id}`);
  }

  uploadManual(cmd: ManualUploadCommand): Promise<ManualUploadResult> {
    const form = new FormData();
    form.append("file", cmd.file, "manual.pdf");
    form.append("title", cmd.title);
    form.append("asset_model", cmd.assetModel);
    if (cmd.replacesManualId) form.append("replaces_manual_id", cmd.replacesManualId);
    return this.request<ManualUploadResult>("/v1/manuals", { method: "POST", form });
  }

  reindexManual(id: string): Promise<ReindexResult> {
    return this.request<ReindexResult>(`/v1/manuals/${id}/reindex`, { method: "POST", body: {} });
  }

  deleteManual(id: string): Promise<void> {
    return this.request<void>(`/v1/manuals/${id}`, { method: "DELETE" });
  }
}

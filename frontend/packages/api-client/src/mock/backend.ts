import {
  ApiError,
  type AuthSession,
  type FinalizeResult,
  type MaintenanceReport,
  type Manual,
  type ManualUploadCommand,
  type ManualUploadResult,
  MAX_MANUAL_BYTES,
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
  type WsEvent,
} from "@superion/domain";
import {
  MOCK_PASSWORD,
  mockAdmin,
  mockProdAdmin,
  mockManuals,
  mockTemplate,
  mockUser,
  mockWorkOrders,
} from "./fixtures";

const INDEXING_MS = 2000;

type EventHandler = (event: WsEvent) => void;

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(16).slice(2)}`;
}

interface SessionState {
  session: Session;
  log: WsEvent[];
  handlers: Set<EventHandler>;
  currentStepIndex: number;
}

/**
 * Backend simulado en memoria. Comparte estado y bus de eventos entre el
 * InMemoryApiClient y el InMemoryWsClient para operar SIN backend real.
 */
export class MockBackend {
  private static instance: MockBackend | null = null;

  private users = new Map<string, UserProfile>([
    [mockUser.email, mockUser],
    [mockAdmin.email, mockAdmin],
    [mockProdAdmin.email, mockProdAdmin],
  ]);
  private workOrders = new Map<string, WorkOrder>(mockWorkOrders.map((w) => [w.id, w]));
  private sessions = new Map<string, SessionState>();
  private manuals = new Map<string, Manual>(mockManuals.map((m) => [m.id, { ...m }]));
  private lastUser: UserProfile = mockUser;
  private timers: ReturnType<typeof setTimeout>[] = [];

  static shared(): MockBackend {
    if (!MockBackend.instance) MockBackend.instance = new MockBackend();
    return MockBackend.instance;
  }

  reset(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.workOrders = new Map(mockWorkOrders.map((w) => [w.id, { ...w }]));
    this.sessions.clear();
    this.manuals = new Map(mockManuals.map((m) => [m.id, { ...m }]));
    this.lastUser = mockUser;
  }

  // ---- Bus ----

  subscribe(sessionId: string, fromSeq: number, handler: EventHandler): () => void {
    const state = this.sessions.get(sessionId);
    if (state) {
      state.handlers.add(handler);
      for (const ev of state.log) {
        if ((ev.seq ?? 0) > fromSeq) handler(ev);
      }
    }
    return () => {
      this.sessions.get(sessionId)?.handlers.delete(handler);
    };
  }

  /** Publica un evento (asigna seq y lo persiste en el log). */
  emit(sessionId: string, event: Omit<WsEvent, "seq" | "session_id" | "created_at">): void {
    const state = this.sessions.get(sessionId);
    if (!state) return;
    const full: WsEvent = {
      ...event,
      seq: state.log.length + 1,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    };
    state.log.push(full);
    state.handlers.forEach((h) => h(full));
  }

  private schedule(fn: () => void, ms: number): void {
    const t = setTimeout(fn, ms);
    this.timers.push(t);
  }

  // ---- Auth ----

  login(email: string, password: string): AuthSession {
    const user = this.users.get(email);
    if (!user || password !== MOCK_PASSWORD) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Credenciales inválidas.");
    }
    this.lastUser = user;
    return {
      access_token: `mock.access.${uuid()}`,
      refresh_token: `mock.refresh.${uuid()}`,
      expires_in: 3600,
      user,
    };
  }

  me(): UserProfile {
    return this.lastUser;
  }

  // ---- Work orders ----

  listWorkOrders(params?: { status?: WorkOrderStatus[] }): Paginated<WorkOrder> {
    let items = [...this.workOrders.values()];
    if (params?.status?.length) {
      const set = new Set(params.status);
      items = items.filter((w) => set.has(w.status));
    }
    return { items, next_cursor: null };
  }

  getWorkOrder(id: string): WorkOrder {
    const wo = this.workOrders.get(id);
    if (!wo) throw new ApiError(404, "WORK_ORDER_NOT_FOUND", "Orden no encontrada.");
    return wo;
  }

  startSession(workOrderId: string): StartSessionResult {
    const wo = this.getWorkOrder(workOrderId);
    if (wo.status === "completed") {
      throw new ApiError(409, "WORK_ORDER_ALREADY_COMPLETED", "La OT ya está completada.");
    }
    const sessionId = `sess-${uuid()}`;
    const startedAt = new Date().toISOString();
    const session: Session = {
      id: sessionId,
      work_order_id: workOrderId,
      technician_id: mockUser.id,
      status: "active",
      started_at: startedAt,
      ended_at: null,
      current_step_index: 0,
      next_seq: 1,
    };
    this.sessions.set(sessionId, {
      session,
      log: [],
      handlers: new Set(),
      currentStepIndex: 0,
    });
    this.workOrders.set(workOrderId, { ...wo, status: "in_progress" });

    // Eventos iniciales persistidos para replay al suscribirse.
    this.emit(sessionId, {
      type: "session.started",
      payload: { started_at: startedAt, work_order_id: workOrderId },
    });
    this.emitStepEntered(sessionId, 0);

    return {
      session_id: sessionId,
      work_order_id: workOrderId,
      procedure_template: mockTemplate,
      langgraph_thread_id: `thread-${uuid()}`,
      started_at: startedAt,
    };
  }

  private emitStepEntered(sessionId: string, index: number): void {
    const step = mockTemplate.steps[index];
    if (!step) return;
    const state = this.sessions.get(sessionId);
    if (state) {
      state.currentStepIndex = index;
      state.session = { ...state.session, current_step_index: index };
    }
    this.emit(sessionId, {
      type: "step.entered",
      step_index: index,
      payload: {
        index: step.index,
        title: step.title,
        description: step.description,
        estimated_minutes: step.estimated_minutes,
        critical: step.critical,
        requires_photo: step.requires_photo,
        photo_criteria: step.photo_criteria,
      },
    });
  }

  // ---- Sessions ----

  getSession(id: string): Session {
    const state = this.sessions.get(id);
    if (!state) throw new ApiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada.");
    return { ...state.session, next_seq: state.log.length + 1 };
  }

  pauseSession(id: string): void {
    const state = this.sessions.get(id);
    if (!state) throw new ApiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada.");
    state.session = { ...state.session, status: "paused" };
    this.emit(id, { type: "session.paused", payload: { reason: "user" } });
  }

  resumeSession(id: string): void {
    const state = this.sessions.get(id);
    if (!state) throw new ApiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada.");
    state.session = { ...state.session, status: "active" };
    this.emit(id, { type: "session.resumed", payload: { reason: "user" } });
  }

  finalizeSession(id: string): FinalizeResult {
    const state = this.sessions.get(id);
    if (!state) throw new ApiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada.");
    const reportId = `rep-${uuid()}`;
    state.session = { ...state.session, status: "finalized", ended_at: new Date().toISOString() };
    this.workOrders.set(state.session.work_order_id, {
      ...this.getWorkOrder(state.session.work_order_id),
      status: "completed",
    });
    this.emit(id, { type: "session.closed", payload: { report_id: reportId } });
    return { session_id: id, report_id: reportId, pdf_url: `mock://reports/${id}.pdf` };
  }

  voiceConnect(id: string): VoiceConnect {
    const state = this.sessions.get(id);
    if (!state) throw new ApiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada.");
    if (state.session.status !== "active" && state.session.status !== "paused") {
      throw new ApiError(409, "SESSION_NOT_ACTIVE", "La sesión no está activa.");
    }
    const wo = this.getWorkOrder(state.session.work_order_id);
    // Demo: al conectar la voz, el asistente "responde" una consulta del manual.
    this.schedule(() => {
      this.emit(id, {
        type: "assistant.answered",
        step_index: state.currentStepIndex,
        payload: {
          step_index: state.currentStepIndex,
          query: "¿Cuál es el torque de la válvula V-12?",
          answer_text: "El torque de apriete es 85 N·m ± 5%.",
          citations: [
            {
              manual_id: mockTemplate.manual_id,
              page: 42,
              section_path: "4. Mantenimiento > 4.3 Válvulas",
              snippet: "Torque de apriete: 85 N·m ± 5%.",
            },
          ],
          confidence: 0.86,
        },
      });
    }, 2500);
    return {
      agent_id: "agent_mock_1",
      connect_mode: "signed_url",
      signed_url: `wss://mock.elevenlabs.test/${id}`,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      dynamic_variables: {
        session_id: id,
        work_order_code: wo.code,
        asset_tag: wo.asset.tag,
      },
    };
  }

  // ---- Photos ----

  uploadPhoto(sessionId: string, cmd: UploadPhotoCommand): PhotoUploadResult {
    const state = this.sessions.get(sessionId);
    if (!state) throw new ApiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada.");
    const photoId = `photo-${uuid()}`;
    this.emit(sessionId, {
      type: "photo.captured",
      step_index: cmd.stepIndex,
      payload: { photo_id: photoId, step_index: cmd.stepIndex },
    });
    // Validación asíncrona simulada → aceptada, y avanza al siguiente paso.
    this.schedule(() => {
      this.emit(sessionId, {
        type: "photo.validated",
        step_index: cmd.stepIndex,
        payload: {
          photo_id: photoId,
          step_index: cmd.stepIndex,
          feedback: "ok",
          caption: cmd.criteria ?? "Evidencia registrada",
        },
      });
      const next = cmd.stepIndex + 1;
      if (mockTemplate.steps[next]) this.emitStepEntered(sessionId, next);
    }, 1200);
    return { photo_id: photoId, status: "pending", uploaded_at: new Date().toISOString() };
  }

  reportPdf(sessionId: string): Blob {
    const state = this.sessions.get(sessionId);
    if (!state || state.session.status !== "finalized") {
      throw new ApiError(409, "SESSION_NOT_FINALIZED", "La sesión no está finalizada.");
    }
    const pdf = "%PDF-1.4\n% SUPERION mock report\n";
    return new Blob([pdf], { type: "application/pdf" });
  }

  getReport(sessionId: string): MaintenanceReport {
    const state = this.sessions.get(sessionId);
    if (!state) throw new ApiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada.");
    const wo = this.getWorkOrder(state.session.work_order_id);
    const doneSteps = new Set<number>();
    for (const ev of state.log) {
      if (ev.type === "step.completed" || ev.type === "photo.validated") {
        doneSteps.add(ev.step_index ?? 0);
      }
    }
    const procedure = mockTemplate.steps.map((step) => ({
      index: step.index,
      title: step.title,
      status: doneSteps.has(step.index) ? ("done" as const) : ("pending" as const),
      skip_reason: null,
      observations: state.log
        .filter((e) => e.type === "assistant.answered" && e.step_index === step.index)
        .map((e) => String((e.payload as { answer_text?: string })?.answer_text ?? ""))
        .filter(Boolean),
      findings: [],
    }));

    return {
      id: `rep-${sessionId}`,
      session_id: sessionId,
      status: state.session.status === "finalized" ? "finalized" : "draft",
      version: 1,
      updated_at: new Date().toISOString(),
      content: {
        header: {
          ot_code: wo.code,
          technician: this.lastUser.full_name,
          asset: wo.asset.name,
          plant: "plant-1",
          started_at: state.session.started_at,
          ended_at: state.session.ended_at,
          duration_min: 30,
        },
        summary: `Mantenimiento ${wo.code}: ${doneSteps.size}/${mockTemplate.steps.length} pasos completados.`,
        procedure,
        findings: [],
        measurements: [],
        photos_gallery: [],
      },
    };
  }

  listSessionEvents(
    sessionId: string,
    params?: { sinceSeq?: number; limit?: number },
  ): { items: SessionEventItem[] } {
    const state = this.sessions.get(sessionId);
    if (!state) throw new ApiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada.");
    const since = params?.sinceSeq ?? 0;
    const limit = params?.limit ?? 500;
    const items: SessionEventItem[] = state.log
      .filter((ev) => (ev.seq ?? 0) > since)
      .slice(0, limit)
      .map((ev) => ({
        seq: ev.seq ?? 0,
        type: ev.type,
        session_id: sessionId,
        step_index: ev.step_index ?? 0,
        payload: (ev.payload ?? {}) as Record<string, unknown>,
        created_at: ev.created_at ?? new Date().toISOString(),
      }));
    return { items };
  }

  listSessions(): { items: SessionListItem[] } {
    if (this.lastUser.role === "technician") {
      throw new ApiError(403, "FORBIDDEN", "Solo supervisores pueden listar sesiones.");
    }
    const items: SessionListItem[] = [...this.sessions.entries()].map(([id, state]) => {
      const wo = this.getWorkOrder(state.session.work_order_id);
      return {
        id,
        work_order_id: state.session.work_order_id,
        work_order_code: wo.code,
        asset_name: wo.asset.name,
        technician_name: mockUser.full_name,
        status: state.session.status,
        started_at: state.session.started_at,
        ended_at: state.session.ended_at,
      };
    });
    items.sort((a, b) => b.started_at.localeCompare(a.started_at));
    return { items };
  }

  // ---- Manuals (RAG) ----

  listManuals(): { items: Manual[] } {
    const items = [...this.manuals.values()].sort((a, b) =>
      b.uploaded_at.localeCompare(a.uploaded_at),
    );
    return { items };
  }

  getManual(id: string): Manual {
    const manual = this.manuals.get(id);
    if (!manual) throw new ApiError(404, "MANUAL_NOT_FOUND", "Manual no encontrado.");
    return manual;
  }

  uploadManual(cmd: ManualUploadCommand): ManualUploadResult {
    if (cmd.file.size <= 0 || !cmd.file.type.includes("pdf")) {
      throw new ApiError(422, "MANUAL_INVALID_PDF", "El archivo no es un PDF válido.");
    }
    if (cmd.file.size > MAX_MANUAL_BYTES) {
      throw new ApiError(413, "MANUAL_TOO_LARGE", "El PDF supera el límite de 50 MB.");
    }
    const id = `man-${uuid()}`;
    const prior = [...this.manuals.values()].filter((m) => m.asset_model === cmd.assetModel);
    const version = prior.reduce((max, m) => Math.max(max, m.version), 0) + 1;

    // Nueva versión activa: las anteriores del mismo modelo se archivan.
    if (cmd.replacesManualId) {
      prior.forEach((m) => this.manuals.set(m.id, { ...m, status: "archived" }));
    }

    const manual: Manual = {
      id,
      title: cmd.title,
      asset_model: cmd.assetModel,
      version,
      status: "indexing",
      index_status: "pending",
      chunk_count: 0,
      uploaded_at: new Date().toISOString(),
      uploaded_by: { id: this.lastUser.id, full_name: this.lastUser.full_name },
    };
    this.manuals.set(id, manual);
    this.scheduleIndexing(id);

    return { manual_id: id, index_status: "pending", estimated_seconds: 90 };
  }

  private scheduleIndexing(id: string): void {
    this.schedule(() => {
      const manual = this.manuals.get(id);
      if (!manual) return;
      this.manuals.set(id, {
        ...manual,
        status: "active",
        index_status: "indexed",
        chunk_count: 120 + Math.floor(Math.random() * 300),
      });
    }, INDEXING_MS);
  }

  reindexManual(id: string): ReindexResult {
    const manual = this.getManual(id);
    this.manuals.set(id, { ...manual, status: "indexing", index_status: "pending" });
    this.scheduleIndexing(id);
    return { manual_id: id, index_status: "pending" };
  }

  deleteManual(id: string): void {
    const manual = this.getManual(id);
    this.manuals.set(id, { ...manual, status: "archived" });
  }
}

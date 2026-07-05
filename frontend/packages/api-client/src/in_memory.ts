import type { LoginInput, LoginResponse, RefreshInput } from '@superion/domain';
import type { AssistantAnswer } from '@superion/domain';
import { AuthError } from '@superion/domain';
import type {
  IApiClient,
  Paginated,
  PhotoUploadResponse,
  Session,
  SessionEventInput,
  SessionEventResponse,
  SessionStart,
  SessionSummary,
  WsEvent,
} from '@superion/domain';
import type { User } from '@superion/domain';
import type { WorkOrder, WorkOrderDetail, WorkOrderFilter } from '@superion/domain';
import { matchesWorkOrderFilter } from '@superion/domain';

import { ApiError } from './errors';
import { buildMaintenanceReport, buildMockPdfBytes, createReportId } from './report_helpers';
import {
  FIXTURE_PROCEDURE_TEMPLATES,
  WORK_ORDER_DETAILS,
  WORK_ORDER_TEMPLATE_IDS,
} from './session_fixtures';

const MOCK_PASSWORD = 'test1234';
const TOKEN_EXPIRES_IN = 3600;
const DEFAULT_PAGE_LIMIT = 10;

const FIXTURE_USERS: User[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'juan@planta.com',
    fullName: 'Juan Pérez',
    role: 'technician',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'maria@planta.com',
    fullName: 'María García',
    role: 'technician',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'pedro@planta.com',
    fullName: 'Pedro López',
    role: 'technician',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'ana@planta.com',
    fullName: 'Ana Ruiz',
    role: 'supervisor',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'admin@planta.com',
    fullName: 'Admin Sistema',
    role: 'rag_admin',
    plantId: '660e8400-e29b-41d4-a716-446655440001',
  },
];

const FIXTURE_WORK_ORDERS: WorkOrder[] = [
  {
    id: '770e8400-e29b-41d4-a716-446655440000',
    code: 'OT-1234',
    status: 'pending',
    priority: 'high',
    procedureName: 'MP-Compresor-C3-v3',
    estimatedMinutes: 90,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440000',
      tag: 'COMP-C3',
      name: 'Compresor C-3',
    },
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    code: 'OT-1235',
    status: 'pending',
    priority: 'med',
    procedureName: 'MP-Bomba-B2-v1',
    estimatedMinutes: 60,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440001',
      tag: 'PUMP-B2',
      name: 'Bomba B-2',
    },
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    code: 'OT-1236',
    status: 'pending',
    priority: 'low',
    procedureName: 'MP-Motor-M1-v2',
    estimatedMinutes: 45,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440002',
      tag: 'MOTOR-M1',
      name: 'Motor M-1',
    },
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440003',
    code: 'OT-1237',
    status: 'in_progress',
    priority: 'high',
    procedureName: 'MP-Valvula-V4',
    estimatedMinutes: 30,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440003',
      tag: 'VALV-V4',
      name: 'Válvula V-4',
    },
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440004',
    code: 'OT-1238',
    status: 'completed',
    priority: 'med',
    procedureName: 'MP-Filtro-F1',
    estimatedMinutes: 20,
    asset: {
      id: '880e8400-e29b-41d4-a716-446655440004',
      tag: 'FILT-F1',
      name: 'Filtro F-1',
    },
  },
];

const PLANT_ID = '660e8400-e29b-41d4-a716-446655440001';

function createDashboardSessionFixtures(now: () => number): SessionSummary[] {
  const baseTime = now() - 45 * 60 * 1000;

  return [
    {
      id: 'aa0e8400-e29b-41d4-a716-446655440001',
      workOrderId: '770e8400-e29b-41d4-a716-446655440000',
      workOrderCode: 'OT-1234',
      assetTag: 'COMP-C3',
      assetName: 'Compresor C-3',
      technicianId: '550e8400-e29b-41d4-a716-446655440000',
      technicianName: 'Juan Pérez',
      status: 'active',
      currentStepIndex: 2,
      currentStepTitle: 'Aislar energía',
      elapsedSeconds: 900,
      lastEventType: 'step.entered',
      lastEventAt: new Date(baseTime).toISOString(),
      plantId: PLANT_ID,
    },
    {
      id: 'aa0e8400-e29b-41d4-a716-446655440002',
      workOrderId: '770e8400-e29b-41d4-a716-446655440001',
      workOrderCode: 'OT-1235',
      assetTag: 'PUMP-B2',
      assetName: 'Bomba B-2',
      technicianId: '550e8400-e29b-41d4-a716-446655440001',
      technicianName: 'María García',
      status: 'active',
      currentStepIndex: 1,
      currentStepTitle: 'Verificar presión',
      elapsedSeconds: 720,
      lastEventType: 'step.completed',
      lastEventAt: new Date(baseTime + 5 * 60 * 1000).toISOString(),
      plantId: PLANT_ID,
    },
    {
      id: 'aa0e8400-e29b-41d4-a716-446655440003',
      workOrderId: '770e8400-e29b-41d4-a716-446655440002',
      workOrderCode: 'OT-1236',
      assetTag: 'MOTOR-M1',
      assetName: 'Motor M-1',
      technicianId: '550e8400-e29b-41d4-a716-446655440002',
      technicianName: 'Pedro López',
      status: 'active',
      currentStepIndex: 0,
      currentStepTitle: 'Inspección visual',
      elapsedSeconds: 300,
      lastEventType: 'session.started',
      lastEventAt: new Date(baseTime + 10 * 60 * 1000).toISOString(),
      plantId: PLANT_ID,
    },
    {
      id: 'aa0e8400-e29b-41d4-a716-446655440004',
      workOrderId: '770e8400-e29b-41d4-a716-446655440003',
      workOrderCode: 'OT-1237',
      assetTag: 'VALV-V4',
      assetName: 'Válvula V-4',
      technicianId: '550e8400-e29b-41d4-a716-446655440000',
      technicianName: 'Juan Pérez',
      status: 'paused',
      currentStepIndex: 4,
      currentStepTitle: 'Ajustar torque',
      elapsedSeconds: 1200,
      lastEventType: 'session.paused',
      lastEventAt: new Date(baseTime + 15 * 60 * 1000).toISOString(),
      plantId: PLANT_ID,
    },
    {
      id: 'aa0e8400-e29b-41d4-a716-446655440005',
      workOrderId: '770e8400-e29b-41d4-a716-446655440004',
      workOrderCode: 'OT-1238',
      assetTag: 'FILT-F1',
      assetName: 'Filtro F-1',
      technicianId: '550e8400-e29b-41d4-a716-446655440001',
      technicianName: 'María García',
      status: 'finalized',
      currentStepIndex: 8,
      currentStepTitle: 'Cierre',
      elapsedSeconds: 1800,
      lastEventType: 'session.closed',
      lastEventAt: new Date(now() - 20 * 60 * 1000).toISOString(),
      plantId: PLANT_ID,
    },
  ];
}

function cloneDashboardSessions(sessions: SessionSummary[]): SessionSummary[] {
  return sessions.map((item) => ({ ...item }));
}

interface StoredSession {
  session: Session;
  procedureTemplateId: string;
  acceptedPhotoSteps: Set<number>;
  photoRetries: Map<number, number>;
  nextEventSeq: number;
  reportId: string;
  reportVersion: number;
  skippedSteps: Set<number>;
  findings: import('@superion/domain').ReportFinding[];
  measurements: import('@superion/domain').ReportMeasurement[];
  photoGallery: import('@superion/domain').ReportPhoto[];
}

export type PhotoWsEventEmitter = (event: WsEvent) => void;

function cloneProcedureTemplate(templateId: string) {
  const template = FIXTURE_PROCEDURE_TEMPLATES[templateId];
  if (!template) {
    return null;
  }
  return {
    ...template,
    steps: template.steps.map((step) => ({ ...step })),
    criticalStepIndices: [...template.criticalStepIndices],
    photoRequiredStepIndices: [...template.photoRequiredStepIndices],
  };
}

function createPhotoId(counter: number): string {
  return `aa0e8400-e29b-41d4-a716-${String(counter).padStart(12, '0')}`;
}

async function readBlobBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    try {
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      // jsdom Blob puede no implementar arrayBuffer correctamente
    }
  }

  if (typeof file.text === 'function') {
    const text = await file.text();
    return new TextEncoder().encode(text);
  }

  return new Uint8Array();
}

function createSessionId(counter: number): string {
  return `880e8400-e29b-41d4-a716-44665544${String(counter).padStart(4, '0')}`;
}

function createThreadId(counter: number): string {
  return `990e8400-e29b-41d4-a716-44665544${String(counter).padStart(4, '0')}`;
}

const MOCK_ASSISTANT_CITATIONS: AssistantAnswer['citations'] = [
  {
    manualId: 'manual-comp-1',
    manualVersion: 3,
    page: 42,
    sectionPath: '4. Mantenimiento > 4.3 Válvulas',
    chunkId: 'chunk-42',
    snippet: 'Torque de apriete: 85 N·m ± 5%.',
  },
  {
    manualId: 'manual-comp-1',
    manualVersion: 3,
    page: 45,
    sectionPath: '4. Mantenimiento > 4.5 Mantenimiento',
    chunkId: 'chunk-45',
    snippet: 'Verificar torque periódicamente.',
  },
];

function buildMockAssistantAnswer(question: string): AssistantAnswer {
  return {
    query: question,
    answerText: 'El torque de apriete es 85 N·m ± 5%.',
    citations: MOCK_ASSISTANT_CITATIONS,
    confidence: 0.82,
  };
}

function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis.btoa(binary);
}

export function createMockJwt(user: User, expiresIn: number, now: number): string {
  const header = base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(now / 1000) + expiresIn;
  const payload = base64Encode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      plant_id: user.plantId,
      exp,
    }),
  );
  const signature = base64Encode('mock-signature');
  return `${header}.${payload}.${signature}`;
}

function createMockRefreshToken(userId: string): string {
  return `v1.mock.${userId}`;
}

function paginateWorkOrders(
  items: WorkOrder[],
  filter: WorkOrderFilter = {},
): Paginated<WorkOrder> {
  const limit = filter.limit ?? DEFAULT_PAGE_LIMIT;
  const start = filter.cursor ? Number.parseInt(filter.cursor, 10) : 0;
  const safeStart = Number.isFinite(start) && start >= 0 ? start : 0;
  const pageItems = items.slice(safeStart, safeStart + limit);
  const nextIndex = safeStart + pageItems.length;
  const nextCursor = nextIndex < items.length ? String(nextIndex) : null;

  return {
    items: pageItems.map((item) => ({ ...item, asset: { ...item.asset } })),
    nextCursor,
  };
}

export class InMemoryApiClient implements IApiClient {
  private users: User[] = FIXTURE_USERS.map((user) => ({ ...user }));
  private workOrders: WorkOrder[] = FIXTURE_WORK_ORDERS.map((wo) => ({
    ...wo,
    asset: { ...wo.asset },
  }));
  private currentUser: User | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private now: () => number = () => Date.now();
  private listWorkOrdersError = false;
  private sessions = new Map<string, StoredSession>();
  private workOrderSessionIds = new Map<string, string>();
  private sessionCounter = 0;
  private reportCounter = 0;
  private photoCounter = 0;
  private photoEventEmitter: PhotoWsEventEmitter | null = null;
  private readonly maxPhotoRetries = 3;
  private dashboardSessions: SessionSummary[] = createDashboardSessionFixtures(() => Date.now());
  private sessionNotes = new Map<string, string[]>();

  setPhotoEventEmitter(emitter: PhotoWsEventEmitter | null): void {
    this.photoEventEmitter = emitter;
  }

  setClock(now: () => number): void {
    this.now = now;
  }

  setListWorkOrdersError(enabled: boolean): void {
    this.listWorkOrdersError = enabled;
  }

  private getWorkOrderForSession(stored: StoredSession): WorkOrder {
    const workOrder = this.workOrders.find((item) => item.id === stored.session.workOrderId);
    if (!workOrder) {
      throw new ApiError('Orden de trabajo no encontrada', 404, 'WORK_ORDER_NOT_FOUND');
    }
    return workOrder;
  }

  private buildStoredReport(stored: StoredSession): import('@superion/domain').MaintenanceReport {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    return buildMaintenanceReport({
      reportId: stored.reportId,
      session: stored.session,
      procedureTemplateId: stored.procedureTemplateId,
      workOrder: this.getWorkOrderForSession(stored),
      technician: this.currentUser,
      version: stored.reportVersion,
      acceptedPhotoSteps: stored.acceptedPhotoSteps,
      skippedSteps: stored.skippedSteps,
      findings: stored.findings,
      measurements: stored.measurements,
      photoGallery: stored.photoGallery,
      now: this.now,
    });
  }

  private emitReportUpdated(stored: StoredSession, stepIndex: number): void {
    const emit = this.photoEventEmitter;
    if (!emit) {
      return;
    }

    const seq = stored.nextEventSeq;
    stored.nextEventSeq += 1;

    emit({
      type: 'report.updated',
      seq,
      session_id: stored.session.id,
      created_at: new Date(this.now()).toISOString(),
      payload: {
        report_id: stored.reportId,
        version: stored.reportVersion,
        diff: {
          summary_changed: true,
          step_index: stepIndex,
          added_event_seq: seq,
        },
      },
    });
  }

  setTokens(accessToken: string | null, refreshToken?: string | null): void {
    this.accessToken = accessToken;
    if (refreshToken !== undefined) {
      this.refreshToken = refreshToken;
    }
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const user = this.users.find((fixture) => fixture.email === input.email);
    if (!user || input.password !== MOCK_PASSWORD) {
      throw new AuthError('Credenciales inválidas');
    }

    const timestamp = this.now();
    const accessToken = createMockJwt(user, TOKEN_EXPIRES_IN, timestamp);
    const refreshToken = createMockRefreshToken(user.id);

    this.currentUser = { ...user };
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRES_IN,
      user: { ...user },
    };
  }

  async refresh(input: RefreshInput): Promise<LoginResponse> {
    const user = this.users.find(
      (fixture) => createMockRefreshToken(fixture.id) === input.refreshToken,
    );
    if (!user) {
      throw new AuthError('Refresh token inválido');
    }

    const timestamp = this.now();
    const accessToken = createMockJwt(user, TOKEN_EXPIRES_IN, timestamp);
    const refreshToken = createMockRefreshToken(user.id);

    this.currentUser = { ...user };
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRES_IN,
      user: { ...user },
    };
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async me(): Promise<User> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }
    return { ...this.currentUser };
  }

  async listWorkOrders(filter: WorkOrderFilter = {}): Promise<Paginated<WorkOrder>> {
    if (this.listWorkOrdersError) {
      throw new Error('Error simulado al listar OTs');
    }

    const filtered = this.workOrders.filter((workOrder) =>
      matchesWorkOrderFilter(workOrder, filter),
    );

    return paginateWorkOrders(filtered, filter);
  }

  async listActiveSessions(plantId: string): Promise<SessionSummary[]> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    return cloneDashboardSessions(
      this.dashboardSessions.filter((session) => session.plantId === plantId),
    );
  }

  async addSessionNote(sessionId: string, note: string): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const trimmed = note.trim();
    if (!trimmed) {
      throw new ApiError('La nota no puede estar vacía', 400, 'VALIDATION_ERROR');
    }

    const exists =
      this.dashboardSessions.some((item) => item.id === sessionId) ||
      this.sessions.has(sessionId);
    if (!exists) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    const notes = this.sessionNotes.get(sessionId) ?? [];
    notes.push(trimmed);
    this.sessionNotes.set(sessionId, notes);
  }

  async getWorkOrder(id: string): Promise<WorkOrderDetail> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const workOrder = this.workOrders.find((item) => item.id === id);
    if (!workOrder) {
      throw new ApiError('Orden de trabajo no encontrada', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const details = WORK_ORDER_DETAILS[id] ?? {
      description: '',
      notes: '',
      linkedWoIds: [],
    };
    const procedureTemplateId = WORK_ORDER_TEMPLATE_IDS[id] ?? 'tmpl-compresor';

    return {
      ...workOrder,
      asset: { ...workOrder.asset },
      description: details.description,
      notes: details.notes,
      linkedWoIds: [...details.linkedWoIds],
      procedureTemplateId,
    };
  }

  async startSession(workOrderId: string): Promise<SessionStart> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const workOrderIndex = this.workOrders.findIndex((item) => item.id === workOrderId);
    if (workOrderIndex === -1) {
      throw new ApiError('Orden de trabajo no encontrada', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const workOrder = this.workOrders[workOrderIndex]!;
    if (workOrder.status === 'in_progress' || workOrder.status === 'paused') {
      throw new ApiError(
        'La OT ya tiene una sesión activa',
        409,
        'WORK_ORDER_ALREADY_STARTED',
      );
    }
    if (workOrder.status === 'completed') {
      throw new ApiError('La OT ya está completada', 409, 'WORK_ORDER_ALREADY_COMPLETED');
    }

    const procedureTemplateId = WORK_ORDER_TEMPLATE_IDS[workOrderId] ?? 'tmpl-compresor';
    const procedureTemplate = cloneProcedureTemplate(procedureTemplateId);
    if (!procedureTemplate) {
      throw new ApiError('Plantilla no encontrada', 404, 'WORK_ORDER_NOT_FOUND');
    }

    this.sessionCounter += 1;
    const sessionId = createSessionId(this.sessionCounter);
    const langgraphThreadId = createThreadId(this.sessionCounter);
    const startedAt = new Date(this.now()).toISOString();

    const session: Session = {
      id: sessionId,
      workOrderId,
      technicianId: this.currentUser.id,
      status: 'active',
      startedAt,
      endedAt: null,
      currentStepIndex: 0,
      langgraphThreadId,
      metrics: {
        totalActiveSeconds: 0,
        voiceSeconds: 0,
        photosCount: 0,
        avgStepSeconds: 0,
      },
      nextSeq: 1,
    };

    this.reportCounter += 1;
    const reportId = createReportId(this.reportCounter);

    this.sessions.set(sessionId, {
      session: { ...session },
      procedureTemplateId,
      acceptedPhotoSteps: new Set<number>(),
      photoRetries: new Map<number, number>(),
      nextEventSeq: 1,
      reportId,
      reportVersion: 1,
      skippedSteps: new Set<number>(),
      findings: [
        {
          text: 'Condiciones generales dentro de parámetros',
          severity: 'low',
        },
      ],
      measurements: [],
      photoGallery: [],
    });
    this.workOrderSessionIds.set(workOrderId, sessionId);

    this.workOrders[workOrderIndex] = {
      ...workOrder,
      status: 'in_progress',
      asset: { ...workOrder.asset },
    };

    return {
      sessionId,
      workOrderId,
      procedureTemplate,
      langgraphThreadId,
      websocketUrl: `wss://mock.superion.app/v1/ws/sessions/${sessionId}`,
      startedAt,
    };
  }

  async getSession(id: string): Promise<Session> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const stored = this.sessions.get(id);
    if (!stored) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    return {
      ...stored.session,
      metrics: { ...stored.session.metrics },
    };
  }

  async postSessionEvent(
    sessionId: string,
    event: SessionEventInput,
  ): Promise<SessionEventResponse> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const stored = this.sessions.get(sessionId);
    if (!stored) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    if (stored.session.status === 'finalized') {
      throw new ApiError('La sesión ya está finalizada', 409, 'SESSION_ALREADY_FINALIZED');
    }

    if (event.type === 'step_advance') {
      if (event.stepIndex !== stored.session.currentStepIndex) {
        throw new ApiError('Paso fuera de orden', 409, 'STEP_OUT_OF_ORDER');
      }

      const template = FIXTURE_PROCEDURE_TEMPLATES[stored.procedureTemplateId];
      if (!template) {
        throw new ApiError('Plantilla no encontrada', 404, 'WORK_ORDER_NOT_FOUND');
      }

      if (
        template.photoRequiredStepIndices.includes(event.stepIndex) &&
        !stored.acceptedPhotoSteps.has(event.stepIndex)
      ) {
        throw new ApiError(
          'El paso requiere foto aceptada antes de completar',
          409,
          'STEP_REQUIRES_PHOTO',
        );
      }

      const nextIndex = event.stepIndex + 1;
      const seq = stored.nextEventSeq;
      stored.nextEventSeq += 1;

      stored.session = {
        ...stored.session,
        currentStepIndex: nextIndex < template.steps.length ? nextIndex : event.stepIndex,
        nextSeq: stored.nextEventSeq,
        metrics: {
          ...stored.session.metrics,
          totalActiveSeconds: stored.session.metrics.totalActiveSeconds + 60,
        },
      };
      stored.reportVersion += 1;
      this.sessions.set(sessionId, stored);
      this.emitReportUpdated(stored, event.stepIndex);

      return { seq, accepted: true };
    }

    throw new ApiError(`Tipo de evento no soportado: ${event.type}`, 400, 'VALIDATION_ERROR');
  }

  async pauseSession(sessionId: string): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const stored = this.sessions.get(sessionId);
    if (stored) {
      if (stored.session.status !== 'active') {
        throw new ApiError('Solo se puede pausar una sesión activa', 409, 'VALIDATION_ERROR');
      }

      stored.session = { ...stored.session, status: 'paused' };
      this.sessions.set(sessionId, stored);
      this.syncDashboardSessionStatus(sessionId, 'paused', 'session.paused');

      const workOrderIndex = this.workOrders.findIndex(
        (item) => item.id === stored.session.workOrderId,
      );
      if (workOrderIndex !== -1) {
        const workOrder = this.workOrders[workOrderIndex]!;
        this.workOrders[workOrderIndex] = {
          ...workOrder,
          status: 'paused',
          asset: { ...workOrder.asset },
        };
      }
      return;
    }

    const dashboardIndex = this.dashboardSessions.findIndex((item) => item.id === sessionId);
    if (dashboardIndex === -1) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    const dashboardSession = this.dashboardSessions[dashboardIndex]!;
    if (dashboardSession.status !== 'active') {
      throw new ApiError('Solo se puede pausar una sesión activa', 409, 'VALIDATION_ERROR');
    }

    this.syncDashboardSessionStatus(sessionId, 'paused', 'session.paused');
  }

  async resumeSession(sessionId: string): Promise<void> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const stored = this.sessions.get(sessionId);
    if (stored) {
      if (stored.session.status !== 'paused') {
        throw new ApiError('Solo se puede reanudar una sesión pausada', 409, 'VALIDATION_ERROR');
      }

      stored.session = { ...stored.session, status: 'active' };
      this.sessions.set(sessionId, stored);
      this.syncDashboardSessionStatus(sessionId, 'active', 'session.resumed');

      const workOrderIndex = this.workOrders.findIndex(
        (item) => item.id === stored.session.workOrderId,
      );
      if (workOrderIndex !== -1) {
        const workOrder = this.workOrders[workOrderIndex]!;
        this.workOrders[workOrderIndex] = {
          ...workOrder,
          status: 'in_progress',
          asset: { ...workOrder.asset },
        };
      }
      return;
    }

    const dashboardIndex = this.dashboardSessions.findIndex((item) => item.id === sessionId);
    if (dashboardIndex === -1) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    const dashboardSession = this.dashboardSessions[dashboardIndex]!;
    if (dashboardSession.status !== 'paused') {
      throw new ApiError('Solo se puede reanudar una sesión pausada', 409, 'VALIDATION_ERROR');
    }

    this.syncDashboardSessionStatus(sessionId, 'active', 'session.resumed');
  }

  async askAssistant(sessionId: string, question: string): Promise<AssistantAnswer> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const stored = this.sessions.get(sessionId);
    if (!stored) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    if (stored.session.status === 'finalized') {
      throw new ApiError('La sesión ya está finalizada', 409, 'SESSION_ALREADY_FINALIZED');
    }

    const trimmed = question.trim();
    if (!trimmed) {
      throw new ApiError('La pregunta no puede estar vacía', 400, 'VALIDATION_ERROR');
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 150);
    });

    return buildMockAssistantAnswer(trimmed);
  }

  async uploadPhoto(
    sessionId: string,
    file: Blob,
    stepIndex: number,
    criteria?: string,
    _eventId?: string,
  ): Promise<PhotoUploadResponse> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const stored = this.sessions.get(sessionId);
    if (!stored) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    if (stored.session.status === 'finalized') {
      throw new ApiError('La sesión ya está finalizada', 409, 'SESSION_ALREADY_FINALIZED');
    }

    const bytes = await readBlobBytes(file);
    const firstByte = bytes[0] ?? 0;
    const firstChar = String.fromCharCode(firstByte);
    this.photoCounter += 1;
    const photoId = createPhotoId(this.photoCounter);
    const uploadedAt = new Date(this.now()).toISOString();
    const capturedSeq = stored.nextEventSeq;
    stored.nextEventSeq += 1;

    const emit = this.photoEventEmitter;
    if (emit) {
      globalThis.setTimeout(() => {
        emit({
          type: 'photo.captured',
          seq: capturedSeq,
          session_id: sessionId,
          created_at: new Date(this.now()).toISOString(),
          payload: {
            photo_id: photoId,
            step_index: stepIndex,
            thumbnail_url: `mock://thumb/${photoId}`,
          },
        });

        if (firstChar === 'A') {
          stored.acceptedPhotoSteps.add(stepIndex);
          stored.photoGallery.push({
            path: `mock://photo/${photoId}`,
            caption: criteria ?? 'Evidencia aceptada',
            thumbnailUrl: `mock://thumb/${photoId}`,
          });
          stored.reportVersion += 1;
          stored.session = {
            ...stored.session,
            metrics: {
              ...stored.session.metrics,
              photosCount: stored.session.metrics.photosCount + 1,
            },
          };
          this.sessions.set(sessionId, stored);
          this.emitReportUpdated(stored, stepIndex);

          emit({
            type: 'photo.validated',
            seq: capturedSeq + 1,
            session_id: sessionId,
            created_at: new Date(this.now()).toISOString(),
            payload: {
              photo_id: photoId,
              step_index: stepIndex,
              feedback: 'ok',
              caption: criteria ?? 'Evidencia aceptada',
            },
          });
          return;
        }

        if (firstChar === 'R') {
          const retries = (stored.photoRetries.get(stepIndex) ?? 0) + 1;
          stored.photoRetries.set(stepIndex, retries);
          this.sessions.set(sessionId, stored);

          emit({
            type: 'photo.rejected',
            seq: capturedSeq + 1,
            session_id: sessionId,
            created_at: new Date(this.now()).toISOString(),
            payload: {
              photo_id: photoId,
              step_index: stepIndex,
              feedback: 'No se ve el candado. Acércate más.',
              retries,
              max_retries: this.maxPhotoRetries,
            },
          });
        }
      }, 100);
    }

    return {
      photoId,
      status: 'pending',
      uploadedAt,
    };
  }

  async getReport(sessionId: string): Promise<import('@superion/domain').MaintenanceReport> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const stored = this.sessions.get(sessionId);
    if (!stored) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    return this.buildStoredReport(stored);
  }

  async getReportPdf(sessionId: string): Promise<Blob> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const stored = this.sessions.get(sessionId);
    if (!stored) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    if (stored.session.status !== 'finalized') {
      throw new ApiError(
        'El reporte PDF solo está disponible tras finalizar',
        409,
        'SESSION_NOT_FINALIZED',
      );
    }

    const workOrder = this.getWorkOrderForSession(stored);
    const pdfBody = buildMockPdfBytes(workOrder.code);
    return new Blob([pdfBody], { type: 'application/pdf' });
  }

  async finalizeSession(
    sessionId: string,
  ): Promise<import('@superion/domain').FinalizeSessionResponse> {
    if (!this.currentUser) {
      throw new AuthError('No autenticado');
    }

    const stored = this.sessions.get(sessionId);
    if (!stored) {
      throw new ApiError('Sesión no encontrada', 404, 'SESSION_NOT_FOUND');
    }

    if (stored.session.status === 'finalized') {
      throw new ApiError('La sesión ya está finalizada', 409, 'SESSION_ALREADY_FINALIZED');
    }

    const template = FIXTURE_PROCEDURE_TEMPLATES[stored.procedureTemplateId];
    if (!template) {
      throw new ApiError('Plantilla no encontrada', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const endedAt = new Date(this.now()).toISOString();
    stored.session = {
      ...stored.session,
      status: 'finalized',
      endedAt,
      currentStepIndex: template.steps.length - 1,
    };
    stored.reportVersion += 1;
    this.sessions.set(sessionId, stored);

    const workOrderIndex = this.workOrders.findIndex(
      (item) => item.id === stored.session.workOrderId,
    );
    if (workOrderIndex !== -1) {
      const workOrder = this.workOrders[workOrderIndex]!;
      this.workOrders[workOrderIndex] = {
        ...workOrder,
        status: 'completed',
        asset: { ...workOrder.asset },
      };
    }

    const emit = this.photoEventEmitter;
    if (emit) {
      const closedSeq = stored.nextEventSeq;
      stored.nextEventSeq += 1;
      emit({
        type: 'session.closed',
        seq: closedSeq,
        session_id: sessionId,
        created_at: endedAt,
        payload: {},
      });
      this.emitReportUpdated(stored, stored.session.currentStepIndex);
    }

    const pdfExpiresAt = new Date(this.now() + 15 * 60 * 1000).toISOString();

    return {
      sessionId,
      reportId: stored.reportId,
      pdfUrl: `mock://pdf/${sessionId}`,
      pdfExpiresAt,
    };
  }

  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  private syncDashboardSessionStatus(
    sessionId: string,
    status: SessionSummary['status'],
    lastEventType: string,
  ): void {
    const index = this.dashboardSessions.findIndex((item) => item.id === sessionId);
    if (index === -1) {
      return;
    }

    const current = this.dashboardSessions[index]!;
    this.dashboardSessions[index] = {
      ...current,
      status,
      lastEventType,
      lastEventAt: new Date(this.now()).toISOString(),
    };

    const emit = this.photoEventEmitter;
    if (!emit) {
      return;
    }

    emit({
      type: lastEventType,
      seq: Date.now(),
      session_id: sessionId,
      created_at: new Date(this.now()).toISOString(),
      payload: { reason: 'user' },
    });
  }

  reset(): void {
    this.users = FIXTURE_USERS.map((user) => ({ ...user }));
    this.workOrders = FIXTURE_WORK_ORDERS.map((wo) => ({
      ...wo,
      asset: { ...wo.asset },
    }));
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.now = () => Date.now();
    this.listWorkOrdersError = false;
    this.sessions.clear();
    this.workOrderSessionIds.clear();
    this.sessionCounter = 0;
    this.reportCounter = 0;
    this.photoCounter = 0;
    this.photoEventEmitter = null;
    this.dashboardSessions = createDashboardSessionFixtures(this.now);
    this.sessionNotes.clear();
  }
}

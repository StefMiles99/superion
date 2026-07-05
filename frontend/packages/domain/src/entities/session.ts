import type { MaintenanceSession, SessionStatus } from './maintenance_session';
import { isSessionStatus, validateMaintenanceSession } from './maintenance_session';
import type {
  ProcedureTemplate,
  Step,
} from './procedure_template';
import {
  getCurrentStep,
  getStepDisplayNumber,
  getTotalSteps,
  stepRequiresPhoto,
  validateProcedureTemplate,
} from './procedure_template';
import type { WsEvent } from '../ports/IWsClient';

export type { ProcedureTemplate, Step } from './procedure_template';
export {
  getCurrentStep,
  getStepDisplayNumber,
  getTotalSteps,
  stepRequiresPhoto,
  validateProcedureTemplate,
} from './procedure_template';

export interface SessionStart {
  sessionId: string;
  workOrderId: string;
  procedureTemplate: ProcedureTemplate;
  langgraphThreadId: string;
  websocketUrl: string;
  startedAt: string;
}

export interface SessionMetrics {
  totalActiveSeconds: number;
  voiceSeconds: number;
  photosCount: number;
  avgStepSeconds: number;
}

export interface Session extends MaintenanceSession {
  metrics: SessionMetrics;
  nextSeq: number;
}

export interface SessionEventInput {
  eventId: string;
  type: 'step_advance' | 'step_skip' | 'command' | 'measurement' | 'finding';
  stepIndex: number;
  payload: Record<string, unknown>;
}

export interface SessionEventResponse {
  seq: number;
  accepted: boolean;
}

export function parseSessionStatus(value: string): SessionStatus | null {
  return isSessionStatus(value) ? value : null;
}

export interface SessionSummary {
  id: string;
  workOrderId: string;
  workOrderCode: string;
  assetTag: string;
  assetName: string;
  technicianId: string;
  technicianName: string;
  status: SessionStatus;
  currentStepIndex: number;
  currentStepTitle: string;
  elapsedSeconds: number;
  lastEventType: string;
  lastEventAt: string;
  plantId: string;
}

export interface ActiveSessionsFilter {
  status?: SessionStatus;
  technicianId?: string;
}

export interface SessionWsEventContext {
  plantId: string;
  resolveTechnicianName?: (technicianId: string) => string | undefined;
}

export function validateSessionSummary(summary: SessionSummary): void {
  if (summary.elapsedSeconds < 0) {
    throw new Error('elapsedSeconds debe ser >= 0');
  }
  if (summary.currentStepIndex < 0) {
    throw new Error('currentStepIndex debe ser >= 0');
  }
  if (!isSessionStatus(summary.status)) {
    throw new Error(`status inválido: ${summary.status}`);
  }

  validateMaintenanceSession({
    id: summary.id,
    workOrderId: summary.workOrderId,
    technicianId: summary.technicianId,
    status: summary.status,
    startedAt: summary.lastEventAt,
    endedAt: summary.status === 'finalized' ? summary.lastEventAt : null,
    currentStepIndex: summary.currentStepIndex,
  });
}

export function filterSessionSummaries(
  sessions: SessionSummary[],
  filter: ActiveSessionsFilter,
): SessionSummary[] {
  return sessions.filter((session) => {
    if (filter.status && session.status !== filter.status) {
      return false;
    }
    if (filter.technicianId && session.technicianId !== filter.technicianId) {
      return false;
    }
    return true;
  });
}

export function resolveWorkOrderCode(workOrderId: string, knownCode?: string): string {
  if (knownCode) {
    return knownCode;
  }
  if (workOrderId.startsWith('wo-')) {
    return `OT-${workOrderId.slice('wo-'.length)}`;
  }
  return workOrderId;
}

function readPayloadRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'object' && payload !== null) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function upsertSessionSummary(
  sessions: SessionSummary[],
  nextSummary: SessionSummary,
): SessionSummary[] {
  const index = sessions.findIndex((item) => item.id === nextSummary.id);
  if (index === -1) {
    return [...sessions, nextSummary];
  }

  const copy = [...sessions];
  copy[index] = nextSummary;
  return copy;
}

export function applySessionWsEvent(
  sessions: SessionSummary[],
  event: WsEvent,
  context: SessionWsEventContext,
): SessionSummary[] {
  const sessionId = event.session_id;
  if (!sessionId) {
    return sessions;
  }

  const payload = readPayloadRecord(event.payload);
  const createdAt = event.created_at ?? new Date().toISOString();

  if (event.type === 'session.started') {
    const workOrderId = String(payload.work_order_id ?? '');
    const technicianId = String(
      payload.technician_id ?? '550e8400-e29b-41d4-a716-446655440000',
    );
    const technicianName =
      typeof payload.technician_name === 'string'
        ? payload.technician_name
        : context.resolveTechnicianName?.(technicianId) ?? 'Técnico';

    const summary: SessionSummary = {
      id: sessionId,
      workOrderId,
      workOrderCode: resolveWorkOrderCode(workOrderId),
      assetTag: String(payload.asset_tag ?? '—'),
      assetName: String(payload.asset_name ?? '—'),
      technicianId,
      technicianName,
      status: 'active',
      currentStepIndex: 0,
      currentStepTitle: String(payload.current_step_title ?? '—'),
      elapsedSeconds: 0,
      lastEventType: event.type,
      lastEventAt: String(payload.started_at ?? createdAt),
      plantId: context.plantId,
    };

    validateSessionSummary(summary);
    return upsertSessionSummary(sessions, summary);
  }

  const existing = sessions.find((item) => item.id === sessionId);
  if (!existing) {
    return sessions;
  }

  if (event.type === 'session.paused') {
    return upsertSessionSummary(sessions, {
      ...existing,
      status: 'paused',
      lastEventType: event.type,
      lastEventAt: createdAt,
    });
  }

  if (event.type === 'session.resumed') {
    return upsertSessionSummary(sessions, {
      ...existing,
      status: 'active',
      lastEventType: event.type,
      lastEventAt: createdAt,
    });
  }

  if (event.type === 'session.closed') {
    return sessions.filter((item) => item.id !== sessionId);
  }

  return sessions;
}

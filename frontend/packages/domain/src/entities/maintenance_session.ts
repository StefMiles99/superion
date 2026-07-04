export type SessionStatus = 'active' | 'paused' | 'finalized' | 'aborted';

const SESSION_STATUSES: SessionStatus[] = ['active', 'paused', 'finalized', 'aborted'];

export interface MaintenanceSession {
  id: string;
  workOrderId: string;
  technicianId: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  currentStepIndex: number;
  langgraphThreadId?: string;
}

export function isSessionStatus(value: string): value is SessionStatus {
  return SESSION_STATUSES.includes(value as SessionStatus);
}

export function canPauseSession(session: MaintenanceSession): boolean {
  return session.status === 'active';
}

export function canResumeSession(session: MaintenanceSession): boolean {
  return session.status === 'paused';
}

export function validateMaintenanceSession(session: MaintenanceSession): void {
  if (session.currentStepIndex < 0) {
    throw new Error('currentStepIndex debe ser >= 0');
  }
  if (!isSessionStatus(session.status)) {
    throw new Error(`status inválido: ${session.status}`);
  }
}

import type { MaintenanceSession, SessionStatus } from './maintenance_session';
import { isSessionStatus } from './maintenance_session';

export interface Step {
  index: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  critical: boolean;
  requiresPhoto: boolean;
  photoCriteria: string | null;
}

export interface ProcedureTemplate {
  id: string;
  name: string;
  manualId: string;
  steps: Step[];
  criticalStepIndices: number[];
  photoRequiredStepIndices: number[];
  estimatedMinutes: number;
}

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

export function getCurrentStep(
  template: ProcedureTemplate,
  stepIndex: number,
): Step | undefined {
  return template.steps[stepIndex];
}

export function stepRequiresPhoto(template: ProcedureTemplate, stepIndex: number): boolean {
  return template.photoRequiredStepIndices.includes(stepIndex);
}

export function getStepDisplayNumber(stepIndex: number): number {
  return stepIndex + 1;
}

export function getTotalSteps(template: ProcedureTemplate): number {
  return template.steps.length;
}

export function validateProcedureTemplate(template: ProcedureTemplate): void {
  if (template.steps.length === 0) {
    throw new Error('steps no puede estar vacío');
  }

  const indices = template.steps.map((step) => step.index);
  const expected = template.steps.map((_, index) => index);
  if (indices.some((index, i) => index !== expected[i])) {
    throw new Error('steps deben tener índices contiguos desde 0');
  }

  const maxIndex = template.steps.length - 1;
  for (const index of template.criticalStepIndices) {
    if (index < 0 || index > maxIndex) {
      throw new Error(`criticalStepIndices fuera de rango: ${String(index)}`);
    }
  }
  for (const index of template.photoRequiredStepIndices) {
    if (index < 0 || index > maxIndex) {
      throw new Error(`photoRequiredStepIndices fuera de rango: ${String(index)}`);
    }
  }
}

export function parseSessionStatus(value: string): SessionStatus | null {
  return isSessionStatus(value) ? value : null;
}

import { describe, expect, it } from 'vitest';

import type { MaintenanceSession } from '../src/entities/maintenance_session';
import {
  canPauseSession,
  canResumeSession,
  validateMaintenanceSession,
} from '../src/entities/maintenance_session';
import type { ProcedureTemplate, Session } from '../src/entities/session';
import {
  getCurrentStep,
  getStepDisplayNumber,
  getTotalSteps,
  stepRequiresPhoto,
  validateProcedureTemplate,
} from '../src/entities/session';

const sampleTemplate: ProcedureTemplate = {
  id: 'tmpl-compresor',
  name: 'MP-Compresor-C3-v3',
  manualId: 'manual-comp-1',
  steps: Array.from({ length: 12 }, (_, index) => ({
    index,
    title: `Paso ${String(index + 1)}`,
    description: `Descripción ${String(index + 1)}`,
    estimatedMinutes: 5,
    critical: index === 3 || index === 7,
    requiresPhoto: index === 3 || index === 5,
    photoCriteria: index === 3 || index === 5 ? 'sensor visible' : null,
  })),
  criticalStepIndices: [3, 7],
  photoRequiredStepIndices: [3, 5],
  estimatedMinutes: 90,
};

const sampleSession: Session = {
  id: 'sess-1',
  workOrderId: 'wo-1',
  technicianId: 'tech-1',
  status: 'active',
  startedAt: '2026-07-04T14:00:00Z',
  endedAt: null,
  currentStepIndex: 0,
  langgraphThreadId: 'thread-1',
  metrics: {
    totalActiveSeconds: 0,
    voiceSeconds: 0,
    photosCount: 0,
    avgStepSeconds: 0,
  },
  nextSeq: 1,
};

describe('ProcedureTemplate invariants', () => {
  it('accepts a valid template with contiguous step indices', () => {
    expect(() => validateProcedureTemplate(sampleTemplate)).not.toThrow();
  });

  it('rejects empty steps', () => {
    expect(() =>
      validateProcedureTemplate({
        ...sampleTemplate,
        steps: [],
        criticalStepIndices: [],
        photoRequiredStepIndices: [],
      }),
    ).toThrow(/steps no puede estar vacío/);
  });

  it('rejects non-contiguous step indices', () => {
    const brokenSteps = sampleTemplate.steps.map((step, index) =>
      index === 2 ? { ...step, index: 5 } : step,
    );
    expect(() =>
      validateProcedureTemplate({
        ...sampleTemplate,
        steps: brokenSteps,
      }),
    ).toThrow(/índices contiguos/);
  });

  it('rejects photo indices out of range', () => {
    expect(() =>
      validateProcedureTemplate({
        ...sampleTemplate,
        photoRequiredStepIndices: [99],
      }),
    ).toThrow(/photoRequiredStepIndices fuera de rango/);
  });
});

describe('Session step helpers', () => {
  it('returns the current step from template', () => {
    const step = getCurrentStep(sampleTemplate, 0);
    expect(step?.title).toBe('Paso 1');
  });

  it('maps step index to display number (1-based)', () => {
    expect(getStepDisplayNumber(0)).toBe(1);
    expect(getStepDisplayNumber(3)).toBe(4);
  });

  it('counts total steps in template', () => {
    expect(getTotalSteps(sampleTemplate)).toBe(12);
  });

  it('detects photo-required steps', () => {
    expect(stepRequiresPhoto(sampleTemplate, 3)).toBe(true);
    expect(stepRequiresPhoto(sampleTemplate, 0)).toBe(false);
  });
});

describe('MaintenanceSession invariants', () => {
  it('validates current_step_index >= 0', () => {
    expect(() => validateMaintenanceSession(sampleSession)).not.toThrow();
    expect(() =>
      validateMaintenanceSession({ ...sampleSession, currentStepIndex: -1 }),
    ).toThrow(/currentStepIndex/);
  });

  it('allows pause only when active', () => {
    expect(canPauseSession(sampleSession)).toBe(true);
    expect(canPauseSession({ ...sampleSession, status: 'paused' })).toBe(false);
  });

  it('allows resume only when paused', () => {
    const paused: MaintenanceSession = { ...sampleSession, status: 'paused' };
    expect(canResumeSession(paused)).toBe(true);
    expect(canResumeSession(sampleSession)).toBe(false);
  });
});

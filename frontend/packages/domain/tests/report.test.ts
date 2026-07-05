import { describe, expect, it } from 'vitest';

import type { MaintenanceReport, ReportContent } from '../src/entities/report';
import {
  getCurrentReportStepIndex,
  getReportProgress,
  getReportStepIcon,
  validateMaintenanceReport,
  validateReportContent,
} from '../src/entities/report';

const sampleContent: ReportContent = {
  header: {
    otCode: 'OT-1234',
    technician: 'Juan Pérez',
    asset: 'Compresor C-3',
    plant: 'Planta Norte',
    startedAt: '2026-07-04T14:00:00Z',
    endedAt: null,
    durationMin: 45,
  },
  summary: 'Mantenimiento en curso. Se completaron los pasos iniciales.',
  procedure: Array.from({ length: 12 }, (_, index) => ({
    index,
    title: `Paso ${String(index + 1)}`,
    startedAt: index <= 4 ? '2026-07-04T14:00:00Z' : null,
    endedAt: index < 4 ? '2026-07-04T14:05:00Z' : null,
    durationMin: index < 4 ? 5 : null,
    status: index < 4 ? 'done' : index === 4 ? 'current' : 'pending',
    photos: [],
    observations: [],
    findings: [],
  })),
  findings: [
    { text: 'Válvula con pequeña fuga', severity: 'low' },
  ],
  measurements: [
    { name: 'presion_psi', value: 85.2, unit: 'psi', stepIndex: 3 },
  ],
  photosGallery: [
    {
      path: 'mock://photo/1',
      caption: 'Sensor visible',
      thumbnailUrl: 'mock://thumb/1',
    },
  ],
};

const sampleReport: MaintenanceReport = {
  id: 'rep-1',
  sessionId: 'sess-1',
  status: 'draft',
  content: sampleContent,
  version: 3,
  updatedAt: '2026-07-04T14:30:00Z',
};

describe('MaintenanceReport invariants', () => {
  it('accepts a valid report', () => {
    expect(() => validateMaintenanceReport(sampleReport)).not.toThrow();
  });

  it('rejects empty report id', () => {
    expect(() =>
      validateMaintenanceReport({ ...sampleReport, id: '' }),
    ).toThrow(/id no puede estar vacío/);
  });

  it('rejects version below 1', () => {
    expect(() =>
      validateMaintenanceReport({ ...sampleReport, version: 0 }),
    ).toThrow(/version debe ser >= 1/);
  });

  it('rejects empty procedure', () => {
    expect(() =>
      validateReportContent({ ...sampleContent, procedure: [] }),
    ).toThrow(/procedure no puede estar vacío/);
  });

  it('rejects non-contiguous procedure indices', () => {
    const brokenProcedure = sampleContent.procedure.map((step, index) =>
      index === 2 ? { ...step, index: 5 } : step,
    );
    expect(() =>
      validateReportContent({ ...sampleContent, procedure: brokenProcedure }),
    ).toThrow(/índices contiguos/);
  });

  it('rejects invalid finding severity', () => {
    expect(() =>
      validateReportContent({
        ...sampleContent,
        findings: [{ text: 'test', severity: 'critical' as 'low' }],
      }),
    ).toThrow(/severity inválida/);
  });
});

describe('Report step helpers', () => {
  it('maps step status to icon', () => {
    expect(getReportStepIcon('done')).toBe('✓');
    expect(getReportStepIcon('current')).toBe('▶');
    expect(getReportStepIcon('skipped')).toBe('⚠');
    expect(getReportStepIcon('pending')).toBe('○');
  });

  it('finds current step index', () => {
    expect(getCurrentReportStepIndex(sampleContent)).toBe(4);
  });

  it('computes 1-based progress', () => {
    expect(getReportProgress(sampleContent)).toEqual({ current: 5, total: 12 });
  });
});

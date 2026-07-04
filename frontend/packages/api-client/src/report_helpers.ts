import type {
  MaintenanceReport,
  ReportContent,
  ReportFinding,
  ReportMeasurement,
  ReportPhoto,
  ReportProcedureStep,
} from '@superion/domain';
import type { ProcedureTemplate, Session } from '@superion/domain';
import type { User, WorkOrder } from '@superion/domain';

import { FIXTURE_PROCEDURE_TEMPLATES } from './session_fixtures';

export interface ReportBuildInput {
  reportId: string;
  session: Session;
  procedureTemplateId: string;
  workOrder: WorkOrder;
  technician: User;
  version: number;
  acceptedPhotoSteps: Set<number>;
  skippedSteps: Set<number>;
  findings: ReportFinding[];
  measurements: ReportMeasurement[];
  photoGallery: ReportPhoto[];
  now: () => number;
}

function createReportId(counter: number): string {
  return `bb0e8400-e29b-41d4-a716-${String(counter).padStart(12, '0')}`;
}

export { createReportId };

export function buildMaintenanceReport(input: ReportBuildInput): MaintenanceReport {
  const template = FIXTURE_PROCEDURE_TEMPLATES[input.procedureTemplateId];
  if (!template) {
    throw new Error('Plantilla no encontrada');
  }

  const { session } = input;
  const isFinalized = session.status === 'finalized';
  const currentIndex = isFinalized ? template.steps.length : session.currentStepIndex;

  const procedure: ReportProcedureStep[] = template.steps.map((step) => {
    let status: ReportProcedureStep['status'] = 'pending';
    if (input.skippedSteps.has(step.index)) {
      status = 'skipped';
    } else if (step.index < currentIndex || (isFinalized && step.index < template.steps.length)) {
      status = 'done';
    } else if (!isFinalized && step.index === currentIndex) {
      status = 'current';
    }

    const photos: ReportPhoto[] = input.acceptedPhotoSteps.has(step.index)
      ? [
          {
            path: `mock://photo/${input.session.id}/${String(step.index)}`,
            caption: step.photoCriteria ?? 'Evidencia fotográfica',
            thumbnailUrl: `mock://thumb/${input.session.id}/${String(step.index)}`,
          },
        ]
      : [];

    return {
      index: step.index,
      title: step.title,
      startedAt: step.index <= currentIndex ? session.startedAt : null,
      endedAt: status === 'done' ? new Date(input.now()).toISOString() : null,
      durationMin: status === 'done' ? step.estimatedMinutes : null,
      status,
      skipReason: status === 'skipped' ? 'No aplica en esta unidad' : null,
      photos,
      observations: [],
      findings: [],
    };
  });

  const doneCount = procedure.filter((step) => step.status === 'done').length;
  const summary =
    session.status === 'finalized'
      ? `Mantenimiento completado en ${input.workOrder.code}. ${String(doneCount)} pasos ejecutados.`
      : `Mantenimiento en curso en ${input.workOrder.code}. ${String(doneCount)} de ${String(template.steps.length)} pasos completados.`;

  const content: ReportContent = {
    header: {
      otCode: input.workOrder.code,
      technician: input.technician.fullName,
      asset: input.workOrder.asset.name,
      plant: 'Planta Norte',
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationMin: Math.max(1, Math.round(session.metrics.totalActiveSeconds / 60)),
    },
    summary,
    procedure,
    findings: input.findings,
    measurements: input.measurements,
    photosGallery: input.photoGallery.length > 0 ? input.photoGallery : collectGalleryFromProcedure(procedure),
    ...(session.status === 'finalized'
      ? { nextActions: ['Programar seguimiento en 30 días'] as string[] }
      : {}),
  };

  return {
    id: input.reportId,
    sessionId: session.id,
    status: session.status === 'finalized' ? 'finalized' : 'draft',
    content,
    version: input.version,
    updatedAt: new Date(input.now()).toISOString(),
  };
}

function collectGalleryFromProcedure(procedure: ReportProcedureStep[]): ReportPhoto[] {
  return procedure.flatMap((step) => step.photos);
}

export function buildMockPdfBytes(otCode: string): string {
  return `%PDF-1.4\n% Mock report for ${otCode}\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF`;
}

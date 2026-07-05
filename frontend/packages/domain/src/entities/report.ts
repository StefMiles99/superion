export type ReportStatus = 'draft' | 'finalized';

export type ReportStepStatus = 'done' | 'skipped' | 'current' | 'pending';

export type FindingSeverity = 'low' | 'med' | 'high';

export interface ReportHeader {
  otCode: string;
  technician: string;
  asset: string;
  plant: string;
  startedAt: string;
  endedAt: string | null;
  durationMin: number;
}

export interface ReportPhoto {
  path: string;
  caption: string;
  thumbnailUrl?: string;
}

export interface ReportFinding {
  text: string;
  severity: FindingSeverity;
}

export interface ReportMeasurement {
  name: string;
  value: number;
  unit: string;
  stepIndex?: number;
}

export interface ReportProcedureStep {
  index: number;
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMin: number | null;
  status: ReportStepStatus;
  skipReason?: string | null;
  photos: ReportPhoto[];
  observations: string[];
  findings: ReportFinding[];
}

export interface ReportContent {
  header: ReportHeader;
  summary: string;
  procedure: ReportProcedureStep[];
  findings: ReportFinding[];
  measurements: ReportMeasurement[];
  photosGallery: ReportPhoto[];
  nextActions?: string[];
}

export interface MaintenanceReport {
  id: string;
  sessionId: string;
  status: ReportStatus;
  content: ReportContent;
  version: number;
  updatedAt: string;
}

export interface FinalizeSessionResponse {
  sessionId: string;
  reportId: string;
  pdfUrl: string;
  pdfExpiresAt: string;
}

const REPORT_STATUSES: ReportStatus[] = ['draft', 'finalized'];
const REPORT_STEP_STATUSES: ReportStepStatus[] = ['done', 'skipped', 'current', 'pending'];
const FINDING_SEVERITIES: FindingSeverity[] = ['low', 'med', 'high'];

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as string[]).includes(value);
}

export function isReportStepStatus(value: string): value is ReportStepStatus {
  return (REPORT_STEP_STATUSES as string[]).includes(value);
}

export function isFindingSeverity(value: string): value is FindingSeverity {
  return (FINDING_SEVERITIES as string[]).includes(value);
}

export function validateMaintenanceReport(report: MaintenanceReport): void {
  if (!report.id.trim()) {
    throw new Error('id no puede estar vacío');
  }
  if (!report.sessionId.trim()) {
    throw new Error('sessionId no puede estar vacío');
  }
  if (!isReportStatus(report.status)) {
    throw new Error(`status inválido: ${report.status}`);
  }
  if (report.version < 1) {
    throw new Error('version debe ser >= 1');
  }
  if (!report.updatedAt.trim()) {
    throw new Error('updatedAt no puede estar vacío');
  }
  validateReportContent(report.content);
}

export function validateReportContent(content: ReportContent): void {
  if (!content.header.otCode.trim()) {
    throw new Error('header.otCode no puede estar vacío');
  }
  if (content.procedure.length === 0) {
    throw new Error('procedure no puede estar vacío');
  }

  const indices = content.procedure.map((step) => step.index);
  const expected = content.procedure.map((_, index) => index);
  if (indices.some((index, i) => index !== expected[i])) {
    throw new Error('procedure debe tener índices contiguos desde 0');
  }

  for (const step of content.procedure) {
    if (!isReportStepStatus(step.status)) {
      throw new Error(`status de paso inválido: ${step.status}`);
    }
    for (const finding of step.findings) {
      if (!isFindingSeverity(finding.severity)) {
        throw new Error(`severity inválida: ${finding.severity}`);
      }
    }
  }

  for (const finding of content.findings) {
    if (!isFindingSeverity(finding.severity)) {
      throw new Error(`severity inválida: ${finding.severity}`);
    }
  }
}

export function getReportStepIcon(status: ReportStepStatus): string {
  switch (status) {
    case 'done':
      return '✓';
    case 'current':
      return '▶';
    case 'skipped':
      return '⚠';
    case 'pending':
      return '○';
    default:
      return '○';
  }
}

export function getCurrentReportStepIndex(content: ReportContent): number {
  const current = content.procedure.find((step) => step.status === 'current');
  if (current) {
    return current.index;
  }

  const lastDone = [...content.procedure].reverse().find((step) => step.status === 'done');
  if (lastDone) {
    return lastDone.index;
  }

  return 0;
}

export function getReportProgress(content: ReportContent): { current: number; total: number } {
  return {
    current: getCurrentReportStepIndex(content) + 1,
    total: content.procedure.length,
  };
}

export interface Step {
  index: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  critical: boolean;
  requiresPhoto: boolean;
  photoCriteria: string | null;
}

export type ProcedureTemplateStatus = 'active' | 'archived';

export interface ProcedureTemplate {
  id: string;
  name: string;
  version: number;
  manualId: string;
  assetId?: string | null;
  steps: Step[];
  criticalStepIndices: number[];
  photoRequiredStepIndices: number[];
  estimatedMinutes: number;
  status: ProcedureTemplateStatus;
}

export interface ProcedureTemplateListItem {
  id: string;
  name: string;
  version: number;
  manualId: string;
  manualTitle: string;
  stepCount: number;
  estimatedMinutes: number;
  status: ProcedureTemplateStatus;
}

export interface CreateProcedureTemplateInput {
  name: string;
  version: number;
  manualId: string;
  assetId?: string | null;
  estimatedMinutes: number;
  steps: Step[];
}

export type UpdateProcedureTemplateInput = CreateProcedureTemplateInput;

export function deriveStepIndices(steps: Step[]): {
  criticalStepIndices: number[];
  photoRequiredStepIndices: number[];
} {
  const criticalStepIndices: number[] = [];
  const photoRequiredStepIndices: number[] = [];

  for (const step of steps) {
    if (step.critical) {
      criticalStepIndices.push(step.index);
    }
    if (step.requiresPhoto) {
      photoRequiredStepIndices.push(step.index);
    }
  }

  return { criticalStepIndices, photoRequiredStepIndices };
}

export function normalizeStepIndices(steps: Step[]): Step[] {
  return steps.map((step, index) => ({ ...step, index }));
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

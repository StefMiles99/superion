import type { Step } from '../entities/procedure_template';

export interface ProcedureValidationError {
  field: string;
  messageKey: string;
}

export interface ProcedureTemplateDraft {
  name: string;
  version: number;
  manualId: string;
  assetId?: string | null;
  estimatedMinutes: number;
  steps: Step[];
}

export function validateProcedureTemplateDraft(
  draft: ProcedureTemplateDraft,
): ProcedureValidationError[] {
  const errors: ProcedureValidationError[] = [];

  if (!draft.name.trim()) {
    errors.push({ field: 'name', messageKey: 'procedures.validation.nameRequired' });
  }

  if (!Number.isFinite(draft.version) || draft.version < 1) {
    errors.push({ field: 'version', messageKey: 'procedures.validation.versionInvalid' });
  }

  if (!draft.manualId.trim()) {
    errors.push({ field: 'manualId', messageKey: 'procedures.validation.manualRequired' });
  }

  if (!Number.isFinite(draft.estimatedMinutes) || draft.estimatedMinutes <= 0) {
    errors.push({
      field: 'estimatedMinutes',
      messageKey: 'procedures.validation.estimatedMinutesInvalid',
    });
  }

  if (draft.steps.length === 0) {
    errors.push({ field: 'steps', messageKey: 'procedures.validation.stepsRequired' });
    return errors;
  }

  const indices = draft.steps.map((step) => step.index);
  const expected = draft.steps.map((_, index) => index);
  if (indices.some((index, i) => index !== expected[i])) {
    errors.push({ field: 'steps', messageKey: 'procedures.validation.stepsNotContiguous' });
  }

  const maxIndex = draft.steps.length - 1;
  for (const step of draft.steps) {
    if (step.critical && (step.index < 0 || step.index > maxIndex)) {
      errors.push({
        field: `steps.${String(step.index)}.critical`,
        messageKey: 'procedures.validation.criticalOutOfRange',
      });
    }
    if (step.requiresPhoto && (step.index < 0 || step.index > maxIndex)) {
      errors.push({
        field: `steps.${String(step.index)}.requiresPhoto`,
        messageKey: 'procedures.validation.photoOutOfRange',
      });
    }
  }

  for (const step of draft.steps) {
    if (!step.title.trim()) {
      errors.push({
        field: `steps.${String(step.index)}.title`,
        messageKey: 'procedures.validation.stepTitleRequired',
      });
    }

    if (!Number.isFinite(step.estimatedMinutes) || step.estimatedMinutes <= 0) {
      errors.push({
        field: `steps.${String(step.index)}.estimatedMinutes`,
        messageKey: 'procedures.validation.stepMinutesInvalid',
      });
    }

    if (step.requiresPhoto && !step.photoCriteria?.trim()) {
      errors.push({
        field: `steps.${String(step.index)}.photoCriteria`,
        messageKey: 'procedures.validation.photoCriteriaRequired',
      });
    }
  }

  return errors;
}

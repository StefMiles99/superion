import type {
  CreateProcedureTemplateInput,
  ProcedureTemplate,
  ProcedureTemplateListItem,
  Step,
} from '@superion/domain';
import {
  deriveStepIndices,
  normalizeStepIndices,
  validateProcedureTemplate,
} from '@superion/domain';

import { FIXTURE_PROCEDURE_TEMPLATES } from './session_fixtures';

export type StoredProcedureTemplate = ProcedureTemplate;

export function createProcedureTemplateFixtures(): StoredProcedureTemplate[] {
  return Object.values(FIXTURE_PROCEDURE_TEMPLATES).map((template) => ({
    ...template,
    steps: template.steps.map((step) => ({ ...step })),
    criticalStepIndices: [...template.criticalStepIndices],
    photoRequiredStepIndices: [...template.photoRequiredStepIndices],
  }));
}

export function toProcedureTemplateListItem(
  template: StoredProcedureTemplate,
  manualTitle: string,
): ProcedureTemplateListItem {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    manualId: template.manualId,
    manualTitle,
    stepCount: template.steps.length,
    estimatedMinutes: template.estimatedMinutes,
    status: template.status,
  };
}

export function buildProcedureTemplateFromInput(
  id: string,
  input: CreateProcedureTemplateInput,
): StoredProcedureTemplate {
  const steps = normalizeStepIndices(input.steps);
  const { criticalStepIndices, photoRequiredStepIndices } = deriveStepIndices(steps);

  const template: StoredProcedureTemplate = {
    id,
    name: input.name.trim(),
    version: input.version,
    manualId: input.manualId,
    assetId: input.assetId ?? null,
    steps,
    criticalStepIndices,
    photoRequiredStepIndices,
    estimatedMinutes: input.estimatedMinutes,
    status: 'active',
  };

  validateProcedureTemplate(template);
  return template;
}

export function cloneSteps(steps: Step[]): Step[] {
  return steps.map((step) => ({ ...step }));
}

export function cloneProcedureTemplateRecord(
  template: StoredProcedureTemplate,
): StoredProcedureTemplate {
  return {
    ...template,
    steps: cloneSteps(template.steps),
    criticalStepIndices: [...template.criticalStepIndices],
    photoRequiredStepIndices: [...template.photoRequiredStepIndices],
  };
}

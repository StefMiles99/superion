import { describe, expect, it } from 'vitest';

import type { Step } from '../src/entities/procedure_template';
import {
  validateProcedureTemplateDraft,
  type ProcedureTemplateDraft,
} from '../src/validators/procedure_validator';

function buildStep(index: number, overrides: Partial<Step> = {}): Step {
  return {
    index,
    title: `Paso ${String(index + 1)}`,
    description: 'Descripción',
    estimatedMinutes: 5,
    critical: false,
    requiresPhoto: false,
    photoCriteria: null,
    ...overrides,
  };
}

function buildValidDraft(overrides: Partial<ProcedureTemplateDraft> = {}): ProcedureTemplateDraft {
  return {
    name: 'MP-Compresor-C3',
    version: 1,
    manualId: '990e8400-e29b-41d4-a716-446655440000',
    estimatedMinutes: 90,
    steps: [buildStep(0), buildStep(1), buildStep(2)],
    ...overrides,
  };
}

describe('validateProcedureTemplateDraft', () => {
  it('accepts a valid draft', () => {
    expect(validateProcedureTemplateDraft(buildValidDraft())).toEqual([]);
  });

  it('rejects empty name', () => {
    const errors = validateProcedureTemplateDraft(buildValidDraft({ name: '  ' }));
    expect(errors.some((error) => error.field === 'name')).toBe(true);
  });

  it('rejects invalid version', () => {
    const errors = validateProcedureTemplateDraft(buildValidDraft({ version: 0 }));
    expect(errors.some((error) => error.field === 'version')).toBe(true);
  });

  it('rejects missing manual', () => {
    const errors = validateProcedureTemplateDraft(buildValidDraft({ manualId: '' }));
    expect(errors.some((error) => error.field === 'manualId')).toBe(true);
  });

  it('rejects non-positive estimated minutes', () => {
    const errors = validateProcedureTemplateDraft(buildValidDraft({ estimatedMinutes: 0 }));
    expect(errors.some((error) => error.field === 'estimatedMinutes')).toBe(true);
  });

  it('rejects empty steps', () => {
    const errors = validateProcedureTemplateDraft(buildValidDraft({ steps: [] }));
    expect(errors.some((error) => error.field === 'steps')).toBe(true);
  });

  it('rejects non-contiguous step indices', () => {
    const errors = validateProcedureTemplateDraft(
      buildValidDraft({
        steps: [buildStep(0), buildStep(2), buildStep(3)],
      }),
    );
    expect(errors.some((error) => error.messageKey === 'procedures.validation.stepsNotContiguous')).toBe(
      true,
    );
  });

  it('rejects step without title', () => {
    const errors = validateProcedureTemplateDraft(
      buildValidDraft({
        steps: [buildStep(0, { title: '  ' })],
      }),
    );
    expect(errors.some((error) => error.field === 'steps.0.title')).toBe(true);
  });

  it('rejects step with invalid estimated minutes', () => {
    const errors = validateProcedureTemplateDraft(
      buildValidDraft({
        steps: [buildStep(0, { estimatedMinutes: -1 })],
      }),
    );
    expect(errors.some((error) => error.field === 'steps.0.estimatedMinutes')).toBe(true);
  });

  it('requires photo criteria when requires_photo is true', () => {
    const errors = validateProcedureTemplateDraft(
      buildValidDraft({
        steps: [buildStep(0, { requiresPhoto: true, photoCriteria: null })],
      }),
    );
    expect(errors.some((error) => error.field === 'steps.0.photoCriteria')).toBe(true);
  });
});

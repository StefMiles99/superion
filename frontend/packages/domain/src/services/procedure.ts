import type { ProcedureStep } from "../entities";

/** Progreso 0..100 dado el índice del paso actual y el total. */
export function stepProgress(currentIndex: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  const clamped = Math.min(Math.max(currentIndex + 1, 0), totalSteps);
  return Math.round((clamped / totalSteps) * 100);
}

/** ¿El paso permite saltarse? (los críticos no). */
export function canSkipStep(step: ProcedureStep): boolean {
  return !step.critical;
}

/** ¿El paso requiere foto de evidencia? */
export function requiresPhoto(step: ProcedureStep): boolean {
  return step.requires_photo;
}

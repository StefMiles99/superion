import { arrayMove } from '@dnd-kit/sortable';

import type { Step } from '@superion/domain';
import { normalizeStepIndices } from '@superion/domain';

export function sortableIdForStepIndex(index: number): string {
  return `row-${String(index)}`;
}

export function reorderProcedureSteps(
  steps: Step[],
  activeId: string,
  overId: string,
): Step[] | null {
  const oldIndex = steps.findIndex((_, index) => sortableIdForStepIndex(index) === activeId);
  const newIndex = steps.findIndex((_, index) => sortableIdForStepIndex(index) === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return null;
  }

  return normalizeStepIndices(arrayMove(steps, oldIndex, newIndex));
}

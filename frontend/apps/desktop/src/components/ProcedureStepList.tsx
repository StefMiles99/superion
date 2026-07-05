import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';

import type { Step } from '@superion/domain';
import { normalizeStepIndices } from '@superion/domain';
import { Button } from '@superion/ui';

import { ProcedureStepRow } from './ProcedureStepRow';
import { reorderProcedureSteps, sortableIdForStepIndex } from '../services/procedure_step_list';

interface ProcedureStepListProps {
  steps: Step[];
  fieldErrors: Record<string, string>;
  onChange: (steps: Step[]) => void;
}

function createEmptyStep(index: number): Step {
  return {
    index,
    title: '',
    description: '',
    estimatedMinutes: 5,
    critical: false,
    requiresPhoto: false,
    photoCriteria: null,
  };
}

interface SortableStepRowProps {
  sortableId: string;
  step: Step;
  fieldErrors: Record<string, string>;
  onChange: (step: Step) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function SortableStepRow({
  sortableId,
  step,
  fieldErrors,
  onChange,
  onRemove,
  canRemove,
}: SortableStepRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ProcedureStepRow
        step={step}
        fieldErrors={fieldErrors}
        onChange={onChange}
        onRemove={onRemove}
        canRemove={canRemove}
        dragHandleProps={listeners ?? undefined}
      />
    </div>
  );
}

export function ProcedureStepList({ steps, fieldErrors, onChange }: ProcedureStepListProps) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 0 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const reordered = reorderProcedureSteps(steps, String(active.id), String(over.id));
    if (reordered) {
      onChange(reordered);
    }
  };

  const updateStep = (index: number, nextStep: Step) => {
    onChange(steps.map((step, i) => (i === index ? nextStep : step)));
  };

  const removeStep = (index: number) => {
    onChange(normalizeStepIndices(steps.filter((_, i) => i !== index)));
  };

  const addStep = () => {
    onChange(normalizeStepIndices([...steps, createEmptyStep(steps.length)]));
  };

  const sortableIds = steps.map((_, index) => sortableIdForStepIndex(index));

  return (
    <div data-testid="procedure-step-list">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <SortableStepRow
                key={sortableIds[index]}
                sortableId={sortableIds[index]!}
                step={step}
                fieldErrors={fieldErrors}
                onChange={(nextStep) => updateStep(index, nextStep)}
                onRemove={() => removeStep(index)}
                canRemove={steps.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {fieldErrors.steps ? (
        <p className="mt-2 text-xs text-[hsl(0_84%_60%)]">{fieldErrors.steps}</p>
      ) : null}

      <Button type="button" variant="secondary" className="mt-4" onClick={addStep}>
        {t('procedures.steps.add')}
      </Button>
    </div>
  );
}

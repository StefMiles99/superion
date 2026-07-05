import { useTranslation } from 'react-i18next';

import type { Step } from '@superion/domain';
import { Button, Input } from '@superion/ui';

interface ProcedureStepRowProps {
  step: Step;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement> | undefined;
  fieldErrors: Record<string, string>;
  onChange: (step: Step) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function ProcedureStepRow({
  step,
  dragHandleProps,
  fieldErrors,
  onChange,
  onRemove,
  canRemove,
}: ProcedureStepRowProps) {
  const { t } = useTranslation();
  const titleError = fieldErrors[`steps.${String(step.index)}.title`];
  const minutesError = fieldErrors[`steps.${String(step.index)}.estimatedMinutes`];
  const criteriaError = fieldErrors[`steps.${String(step.index)}.photoCriteria`];

  return (
    <div
      data-testid={`step-row-${String(step.index)}`}
      className="rounded-md border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_8%)] p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab rounded px-2 py-1 text-[hsl(215_20%_65%)] hover:bg-[hsl(217_33%_17%)] active:cursor-grabbing"
            aria-label={t('procedures.steps.dragHandle', { number: step.index + 1 })}
            {...dragHandleProps}
          >
            ⠿
          </button>
          <span className="text-sm font-medium text-[hsl(210_40%_98%)]">
            {t('procedures.steps.stepNumber', { number: step.index + 1 })}
          </span>
        </div>
        {canRemove ? (
          <Button type="button" variant="ghost" className="min-h-10 px-2 text-xs" onClick={onRemove}>
            {t('procedures.steps.remove')}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-[hsl(215_20%_65%)]">
            {t('procedures.steps.title')}
          </label>
          <Input
            name="title"
            value={step.title}
            onChange={(event) => onChange({ ...step, title: event.target.value })}
            aria-invalid={titleError ? true : undefined}
          />
          {titleError ? <p className="mt-1 text-xs text-[hsl(0_84%_60%)]">{titleError}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs text-[hsl(215_20%_65%)]">
            {t('procedures.steps.estimatedMinutes')}
          </label>
          <Input
            name="estimatedMinutes"
            type="number"
            min={1}
            value={step.estimatedMinutes}
            onChange={(event) =>
              onChange({ ...step, estimatedMinutes: Number(event.target.value) || 0 })
            }
            aria-invalid={minutesError ? true : undefined}
          />
          {minutesError ? (
            <p className="mt-1 text-xs text-[hsl(0_84%_60%)]">{minutesError}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs text-[hsl(215_20%_65%)]">
          {t('procedures.steps.description')}
        </label>
        <textarea
          name="description"
          value={step.description}
          onChange={(event) => onChange({ ...step, description: event.target.value })}
          rows={2}
          className="w-full rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_6%)] px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={step.critical}
            onChange={(event) => onChange({ ...step, critical: event.target.checked })}
          />
          {t('procedures.steps.critical')}
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={step.requiresPhoto}
            onChange={(event) =>
              onChange({
                ...step,
                requiresPhoto: event.target.checked,
                photoCriteria: event.target.checked ? step.photoCriteria : null,
              })
            }
          />
          {t('procedures.steps.requiresPhoto')}
        </label>
      </div>

      {step.requiresPhoto ? (
        <div className="mt-3">
          <label className="mb-1 block text-xs text-[hsl(215_20%_65%)]">
            {t('procedures.steps.photoCriteria')}
          </label>
          <Input
            name="photoCriteria"
            value={step.photoCriteria ?? ''}
            onChange={(event) => onChange({ ...step, photoCriteria: event.target.value })}
            aria-invalid={criteriaError ? true : undefined}
          />
          {criteriaError ? (
            <p className="mt-1 text-xs text-[hsl(0_84%_60%)]">{criteriaError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

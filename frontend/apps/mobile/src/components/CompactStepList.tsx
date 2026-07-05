import type { Step } from '@superion/domain';
import { useTranslation } from 'react-i18next';

interface CompactStepListProps {
  steps: Step[];
  currentStepIndex: number;
}

export function CompactStepList({ steps, currentStepIndex }: CompactStepListProps) {
  const { t } = useTranslation();
  const remainingSteps = steps.slice(currentStepIndex);

  if (remainingSteps.length === 0) {
    return null;
  }

  return (
    <div className="mt-4" data-testid="compact-step-list">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[hsl(215_20%_55%)]">
        {t('session.remainingSteps')}
      </p>
      <ul
        className="max-h-40 space-y-2 overflow-y-auto pr-1"
        aria-label={t('session.remainingSteps')}
      >
        {remainingSteps.map((step) => {
          const isCurrent = step.index === currentStepIndex;

          return (
            <li
              key={step.index}
              data-testid={`compact-step-${String(step.index)}`}
              data-current={isCurrent ? 'true' : 'false'}
              className={
                isCurrent
                  ? 'rounded-md border-l-4 border-[hsl(217_91%_60%)] bg-[hsl(217_91%_60%/0.08)] px-3 py-2 text-sm font-medium'
                  : 'rounded-md border-l-4 border-transparent px-3 py-2 text-sm text-[hsl(215_20%_65%)]'
              }
            >
              <span className="mr-2 tabular-nums text-[hsl(215_20%_50%)]">
                {step.index + 1}.
              </span>
              {step.title}
              {isCurrent ? (
                <span className="sr-only">{t('session.currentStepMarker')}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

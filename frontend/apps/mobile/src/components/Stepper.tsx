import { useTranslation } from 'react-i18next';

interface StepperProps {
  currentStepIndex: number;
  totalSteps: number;
}

export function Stepper({ currentStepIndex, totalSteps }: StepperProps) {
  const { t } = useTranslation();
  const currentNumber = currentStepIndex + 1;

  return (
    <div className="space-y-3" data-testid="stepper">
      <p className="text-lg font-semibold">
        {t('session.stepProgress', { current: currentNumber, total: totalSteps })}
      </p>
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
        role="list"
        aria-label={t('session.stepperLabel')}
      >
        {Array.from({ length: totalSteps }, (_, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <span
              key={index}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              data-testid={`stepper-dot-${String(index)}`}
              data-state={isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}
              className={
                isCurrent
                  ? 'h-3 w-3 shrink-0 rounded-full bg-[hsl(217_91%_60%)] ring-2 ring-[hsl(217_91%_60%/0.4)]'
                  : isCompleted
                    ? 'h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(142_71%_45%)]'
                    : 'h-2.5 w-2.5 shrink-0 rounded-full border border-[hsl(215_20%_45%)] bg-transparent'
              }
            />
          );
        })}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(215_28%_17%)]">
        <div
          className="h-full rounded-full bg-[hsl(217_91%_60%)] transition-all duration-300"
          style={{ width: `${String((currentNumber / totalSteps) * 100)}%` }}
        />
      </div>
    </div>
  );
}

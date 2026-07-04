import type { Step } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { Card } from '@superion/ui';

interface StepCardProps {
  step: Step;
  stepNumber: number;
  totalSteps: number;
}

export function StepCard({ step, stepNumber, totalSteps }: StepCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-5" data-testid="step-card">
      <p className="mb-3 text-sm font-medium text-[hsl(215_20%_65%)]">
        {t('session.stepProgress', { current: stepNumber, total: totalSteps })}
      </p>
      <h2 className="mb-3 text-2xl font-bold leading-tight">{step.title}</h2>
      <p className="whitespace-pre-wrap text-base leading-relaxed text-[hsl(215_20%_75%)]">
        {step.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {step.critical ? (
          <span className="rounded-full bg-[hsl(0_84%_60%/0.15)] px-3 py-1 text-xs font-medium text-[hsl(0_84%_70%)]">
            {t('session.badges.critical')}
          </span>
        ) : null}
        {step.requiresPhoto ? (
          <span className="rounded-full bg-[hsl(217_91%_60%/0.15)] px-3 py-1 text-xs font-medium text-[hsl(217_91%_70%)]">
            {t('session.badges.requiresPhoto')}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

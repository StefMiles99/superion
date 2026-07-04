import type { Step } from '@superion/domain';
import { CriticalBadge, PhotoRequiredBadge, Card } from '@superion/ui';
import { useTranslation } from 'react-i18next';

import { EtaBadge } from './EtaBadge';
import { Timer } from './Timer';

interface StepCardProps {
  step: Step;
  stepSeconds: number;
  etaSeconds: number;
}

export function StepCard({ step, stepSeconds, etaSeconds }: StepCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-5" data-testid="step-card">
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <Timer seconds={stepSeconds} label={t('session.stepTimer')} testId="step-timer" />
        <EtaBadge etaSeconds={etaSeconds} />
      </div>
      <h2 className="mb-3 text-2xl font-bold leading-tight">{step.title}</h2>
      <p className="whitespace-pre-wrap text-base leading-relaxed text-[hsl(215_20%_75%)]">
        {step.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {step.critical ? <CriticalBadge label={t('session.badges.critical')} /> : null}
        {step.requiresPhoto ? (
          <PhotoRequiredBadge label={t('session.badges.requiresPhoto')} />
        ) : null}
      </div>
    </Card>
  );
}

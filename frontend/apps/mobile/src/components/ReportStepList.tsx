import type { ReportProcedureStep } from '@superion/domain';
import { getReportStepIcon } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { Card } from '@superion/ui';

interface ReportStepListProps {
  steps: ReportProcedureStep[];
}

export function ReportStepList({ steps }: ReportStepListProps) {
  const { t } = useTranslation();

  return (
    <Card className="space-y-3" data-testid="report-step-list">
      <h2 className="text-base font-semibold text-[hsl(210_40%_98%)]">
        {t('report.stepsHeading')}
      </h2>
      <ul className="space-y-2" aria-label={t('report.stepsHeading')}>
        {steps.map((step) => {
          const icon = getReportStepIcon(step.status);
          const isCurrent = step.status === 'current';

          return (
            <li
              key={step.index}
              data-testid={`report-step-${String(step.index)}`}
              data-status={step.status}
              className={
                isCurrent
                  ? 'flex items-start gap-3 rounded-md border-l-4 border-[hsl(217_91%_60%)] bg-[hsl(217_91%_60%/0.08)] px-3 py-2'
                  : 'flex items-start gap-3 rounded-md px-3 py-2'
              }
            >
              <span
                className="mt-0.5 w-5 shrink-0 text-center text-sm"
                aria-hidden="true"
              >
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[hsl(210_40%_98%)]">
                  <span className="mr-2 tabular-nums text-[hsl(215_20%_50%)]">
                    {step.index + 1}.
                  </span>
                  {step.title}
                </p>
                {step.status === 'skipped' && step.skipReason ? (
                  <p className="mt-1 text-xs text-[hsl(45_93%_58%)]">{step.skipReason}</p>
                ) : null}
                {isCurrent ? (
                  <span className="sr-only">{t('session.currentStepMarker')}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

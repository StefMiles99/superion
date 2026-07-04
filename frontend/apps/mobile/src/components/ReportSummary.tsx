import type { ReportContent } from '@superion/domain';
import { getReportProgress } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { Card } from '@superion/ui';

interface ReportSummaryProps {
  content: ReportContent;
}

export function ReportSummary({ content }: ReportSummaryProps) {
  const { t } = useTranslation();
  const progress = getReportProgress(content);

  return (
    <Card className="space-y-3" data-testid="report-summary">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[hsl(210_40%_98%)]">
          {t('report.summaryHeading')}
        </h2>
        <span
          className="text-sm text-[hsl(215_20%_65%)]"
          data-testid="report-step-progress"
        >
          {t('session.stepProgress', {
            current: progress.current,
            total: progress.total,
          })}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-[hsl(215_20%_75%)]">{content.summary}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs text-[hsl(215_20%_65%)]">
        <div>
          <dt className="font-medium uppercase tracking-wide">{t('report.header.ot')}</dt>
          <dd className="text-sm text-[hsl(210_40%_98%)]">{content.header.otCode}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wide">{t('report.header.asset')}</dt>
          <dd className="text-sm text-[hsl(210_40%_98%)]">{content.header.asset}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wide">{t('report.header.technician')}</dt>
          <dd className="text-sm text-[hsl(210_40%_98%)]">{content.header.technician}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wide">{t('report.header.duration')}</dt>
          <dd className="text-sm text-[hsl(210_40%_98%)]">
            {t('report.header.durationValue', { minutes: content.header.durationMin })}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

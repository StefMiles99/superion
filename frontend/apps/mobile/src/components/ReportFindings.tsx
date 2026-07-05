import type { ReportFinding } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { Card } from '@superion/ui';

interface ReportFindingsProps {
  findings: ReportFinding[];
}

const SEVERITY_CLASS: Record<ReportFinding['severity'], string> = {
  low: 'text-[hsl(215_20%_75%)]',
  med: 'text-[hsl(45_93%_58%)]',
  high: 'text-[hsl(0_84%_70%)]',
};

export function ReportFindings({ findings }: ReportFindingsProps) {
  const { t } = useTranslation();

  return (
    <Card className="space-y-3" data-testid="report-findings">
      <h2 className="text-base font-semibold text-[hsl(210_40%_98%)]">
        {t('report.findingsHeading')}
      </h2>
      {findings.length === 0 ? (
        <p className="text-sm text-[hsl(215_20%_65%)]">{t('report.findingsEmpty')}</p>
      ) : (
        <ul className="space-y-2" aria-label={t('report.findingsHeading')}>
          {findings.map((finding, index) => (
            <li
              key={`${finding.text}-${String(index)}`}
              className={`text-sm ${SEVERITY_CLASS[finding.severity]}`}
            >
              <span className="mr-2 font-medium uppercase text-xs">
                {t(`report.severity.${finding.severity}`)}
              </span>
              {finding.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

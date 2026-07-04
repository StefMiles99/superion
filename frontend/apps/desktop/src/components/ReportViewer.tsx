import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MaintenanceReport, ReportContent } from '@superion/domain';
import { Card } from '@superion/ui';

type ReportTab = 'summary' | 'procedure' | 'photos' | 'findings' | 'measurements';

interface ReportViewerProps {
  report: MaintenanceReport;
  highlightedStepIndex: number | null;
}

const TAB_KEYS: ReportTab[] = ['summary', 'procedure', 'photos', 'findings', 'measurements'];

const SEVERITY_CLASS: Record<'low' | 'med' | 'high', string> = {
  low: 'bg-[hsl(215_20%_25%)] text-[hsl(215_20%_75%)]',
  med: 'bg-[hsl(45_93%_20%)] text-[hsl(45_93%_70%)]',
  high: 'bg-[hsl(0_84%_20%)] text-[hsl(0_84%_70%)]',
};

function SummaryPanel({ content }: { content: ReportContent }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3" data-testid="report-summary-panel">
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
    </div>
  );
}

function ProcedurePanel({
  content,
  highlightedStepIndex,
}: {
  content: ReportContent;
  highlightedStepIndex: number | null;
}) {
  const { t } = useTranslation();

  return (
    <ul className="space-y-2" aria-label={t('sessionDetail.tabs.procedure')}>
      {content.procedure.map((step) => {
        const isHighlighted = highlightedStepIndex === step.index;
        const isCurrent = step.status === 'current';

        return (
          <li
            key={step.index}
            data-testid={`report-step-${String(step.index)}`}
            data-status={step.status}
            data-highlighted={isHighlighted ? 'true' : 'false'}
            className={
              isHighlighted || isCurrent
                ? 'rounded-md border-l-4 border-[hsl(217_91%_60%)] bg-[hsl(217_91%_60%/0.12)] px-3 py-2'
                : 'rounded-md px-3 py-2'
            }
          >
            <p className="text-sm font-medium text-[hsl(210_40%_98%)]">
              <span className="mr-2 text-[hsl(215_20%_50%)]">
                {t('sessionDetail.stepNumber', { number: step.index + 1 })}
              </span>
              {step.title}
            </p>
            {step.photos.length > 0 ? (
              <div className="mt-2 flex gap-2">
                {step.photos.map((photo) => (
                  <img
                    key={photo.path}
                    src={photo.thumbnailUrl ?? photo.path}
                    alt={photo.caption}
                    className="h-12 w-12 rounded object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function PhotosPanel({ content }: { content: ReportContent }) {
  const { t } = useTranslation();

  if (content.photosGallery.length === 0) {
    return <p className="text-sm text-[hsl(215_20%_65%)]">{t('sessionDetail.photosEmpty')}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {content.photosGallery.map((photo) => (
        <figure key={photo.path} className="overflow-hidden rounded-md border border-[hsl(217_33%_22%)]">
          <img
            src={photo.thumbnailUrl ?? photo.path}
            alt={photo.caption}
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
          <figcaption className="p-2 text-xs text-[hsl(215_20%_65%)]">{photo.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function FindingsPanel({ content }: { content: ReportContent }) {
  const { t } = useTranslation();

  if (content.findings.length === 0) {
    return <p className="text-sm text-[hsl(215_20%_65%)]">{t('report.findingsEmpty')}</p>;
  }

  return (
    <ul className="space-y-2">
      {content.findings.map((finding, index) => (
        <li key={`${finding.text}-${String(index)}`} className="flex items-start gap-2 text-sm">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${SEVERITY_CLASS[finding.severity]}`}
          >
            {t(`report.severity.${finding.severity}`)}
          </span>
          <span className="text-[hsl(215_20%_75%)]">{finding.text}</span>
        </li>
      ))}
    </ul>
  );
}

function MeasurementsPanel({ content }: { content: ReportContent }) {
  const { t } = useTranslation();

  if (content.measurements.length === 0) {
    return <p className="text-sm text-[hsl(215_20%_65%)]">{t('sessionDetail.measurementsEmpty')}</p>;
  }

  return (
    <table className="min-w-full text-left text-sm">
      <thead className="text-xs uppercase text-[hsl(215_20%_65%)]">
        <tr>
          <th className="px-2 py-1">{t('sessionDetail.measurements.name')}</th>
          <th className="px-2 py-1">{t('sessionDetail.measurements.value')}</th>
          <th className="px-2 py-1">{t('sessionDetail.measurements.unit')}</th>
        </tr>
      </thead>
      <tbody>
        {content.measurements.map((measurement) => (
          <tr key={`${measurement.name}-${String(measurement.stepIndex ?? 0)}`} className="border-t border-[hsl(217_33%_17%)]">
            <td className="px-2 py-2">{measurement.name}</td>
            <td className="px-2 py-2 tabular-nums">{measurement.value}</td>
            <td className="px-2 py-2">{measurement.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReportViewer({ report, highlightedStepIndex }: ReportViewerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const tabListId = useId();

  return (
    <Card className="flex h-full min-h-0 flex-col" data-testid="report-viewer">
      <div
        role="tablist"
        aria-label={t('sessionDetail.reportTabs')}
        className="flex flex-wrap gap-1 border-b border-[hsl(217_33%_17%)] pb-2"
      >
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`${tabListId}-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`${tabListId}-panel-${tab}`}
            className={
              activeTab === tab
                ? 'rounded-md bg-[hsl(217_91%_60%/0.15)] px-3 py-1.5 text-sm font-medium text-[hsl(217_91%_70%)]'
                : 'rounded-md px-3 py-1.5 text-sm text-[hsl(215_20%_65%)] hover:bg-[hsl(217_33%_12%)]'
            }
            onClick={() => setActiveTab(tab)}
          >
            {t(`sessionDetail.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-3">
        {TAB_KEYS.map((tab) => (
          <div
            key={tab}
            role="tabpanel"
            id={`${tabListId}-panel-${tab}`}
            aria-labelledby={`${tabListId}-${tab}`}
            hidden={activeTab !== tab}
            className={activeTab === tab ? 'block' : 'hidden'}
          >
            {tab === 'summary' ? <SummaryPanel content={report.content} /> : null}
            {tab === 'procedure' ? (
              <ProcedurePanel
                content={report.content}
                highlightedStepIndex={highlightedStepIndex}
              />
            ) : null}
            {tab === 'photos' ? <PhotosPanel content={report.content} /> : null}
            {tab === 'findings' ? <FindingsPanel content={report.content} /> : null}
            {tab === 'measurements' ? <MeasurementsPanel content={report.content} /> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

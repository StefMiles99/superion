import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { AppShell, Button, Skeleton } from '@superion/ui';

import { DownloadPdfButton } from '../components/DownloadPdfButton';
import { ErrorBanner } from '../components/ErrorBanner';
import { ReportFindings } from '../components/ReportFindings';
import { ReportPhotoGallery } from '../components/ReportPhotoGallery';
import { ReportStepList } from '../components/ReportStepList';
import { ReportSummary } from '../components/ReportSummary';
import { useFinalizeSession } from '../hooks/useFinalizeSession';
import { useReport } from '../hooks/useReport';
import { useSession } from '../hooks/useSession';

function ReportPageSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="report-skeleton">
      <Skeleton height="8rem" className="w-full" />
      <Skeleton height="12rem" className="w-full" />
    </div>
  );
}

export default function ReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: sessionId } = useParams<{ id: string }>();
  const confirmTitleId = useId();

  const { data: session } = useSession(sessionId);
  const { data: report, error, isLoading, refetch } = useReport(sessionId);
  const finalizeSession = useFinalizeSession(sessionId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isFinalized = report?.status === 'finalized' || session?.status === 'finalized';
  const pdfFilename = report
    ? `${report.content.header.otCode}-reporte.pdf`
    : 'reporte.pdf';

  useEffect(() => {
    if (!confirmOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfirmOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirmOpen]);

  const handleConfirmFinalize = () => {
    finalizeSession.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false);
      },
    });
  };

  return (
    <AppShell
      title={t('report.title')}
      backLabel={t('report.back')}
      onBack={() => {
        navigate(`/sessions/${sessionId ?? ''}`);
      }}
    >
      {isLoading ? <ReportPageSkeleton /> : null}

      {error ? (
        <div className="p-4">
          <ErrorBanner
            message={t('report.errorLoading')}
            retryLabel={t('workOrders.retry')}
            onRetry={() => {
              void refetch();
            }}
          />
        </div>
      ) : null}

      {report ? (
        <div className="space-y-4 p-4 pb-24" data-testid="report-page">
          <ReportSummary content={report.content} />
          <ReportStepList steps={report.content.procedure} />
          <ReportFindings findings={report.content.findings} />
          <ReportPhotoGallery photos={report.content.photosGallery} />

          <div
            className="fixed inset-x-0 bottom-0 border-t border-[hsl(217_33%_17%)] bg-[hsl(222_47%_6%)] p-4"
            aria-live="polite"
          >
            {isFinalized ? (
              <DownloadPdfButton sessionId={sessionId!} filename={pdfFilename} />
            ) : (
              <Button
                type="button"
                className="min-h-14 w-full text-base"
                onClick={() => {
                  setConfirmOpen(true);
                }}
                disabled={finalizeSession.isPending}
              >
                {t('report.finalize')}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="finalize-confirm">
          <div
            role="presentation"
            className="absolute inset-0 bg-[hsl(222_47%_6%/0.72)]"
            onClick={() => {
              setConfirmOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            className="relative z-10 w-full max-w-lg rounded-t-2xl border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_8%)] p-4 shadow-xl"
          >
            <h2 id={confirmTitleId} className="text-lg font-semibold text-[hsl(210_40%_98%)]">
              {t('report.finalizeConfirmTitle')}
            </h2>
            <p className="mt-2 text-sm text-[hsl(215_20%_75%)]">
              {t('report.finalizeConfirmBody')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="ghost"
                className="min-h-12"
                onClick={() => {
                  setConfirmOpen(false);
                }}
              >
                {t('report.finalizeCancel')}
              </Button>
              <Button
                type="button"
                className="min-h-12"
                onClick={handleConfirmFinalize}
                disabled={finalizeSession.isPending}
                aria-busy={finalizeSession.isPending}
              >
                {t('report.finalizeConfirm')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

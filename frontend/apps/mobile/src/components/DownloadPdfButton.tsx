import { useTranslation } from 'react-i18next';

import { Button } from '@superion/ui';

import { useDownloadPdf } from '../hooks/useDownloadPdf';

interface DownloadPdfButtonProps {
  sessionId: string;
  filename: string;
}

export function DownloadPdfButton({ sessionId, filename }: DownloadPdfButtonProps) {
  const { t } = useTranslation();
  const downloadPdf = useDownloadPdf(sessionId, filename);

  return (
    <Button
      type="button"
      className="min-h-14 w-full text-base"
      onClick={() => {
        downloadPdf.mutate();
      }}
      disabled={downloadPdf.isPending}
      aria-busy={downloadPdf.isPending}
      data-testid="download-pdf-button"
    >
      {downloadPdf.isPending ? t('report.downloading') : t('report.downloadPdf')}
    </Button>
  );
}

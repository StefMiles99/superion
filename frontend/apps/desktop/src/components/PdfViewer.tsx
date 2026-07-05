import { useTranslation } from 'react-i18next';

interface PdfViewerProps {
  url: string;
  title: string;
}

export function PdfViewer({ url, title }: PdfViewerProps) {
  const { t } = useTranslation();
  const isMockUrl = url.startsWith('mock://');

  if (isMockUrl) {
    return (
      <div
        data-testid="pdf-viewer-placeholder"
        className="flex min-h-[480px] items-center justify-center rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_6%)] p-6 text-center"
      >
        <p className="text-sm text-[hsl(215_20%_65%)]">{t('manuals.detail.previewPlaceholder')}</p>
      </div>
    );
  }

  return (
    <iframe
      data-testid="pdf-viewer"
      title={title}
      src={url}
      className="min-h-[480px] w-full rounded-md border border-[hsl(217_33%_22%)] bg-white"
    />
  );
}

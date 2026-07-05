import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Citation } from '@superion/domain';
import { formatCitationSection, getCitationPdfUrl } from '@superion/domain';
import { Button } from '@superion/ui';

interface ManualViewerModalProps {
  citation: Citation;
  onClose: () => void;
}

function ManualViewerModal({ citation, onClose }: ManualViewerModalProps) {
  const { t } = useTranslation();
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[hsl(222_47%_6%)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="manual-viewer-modal"
    >
      <div className="flex items-center justify-between border-b border-[hsl(217_33%_17%)] p-4">
        <h2 id={titleId} className="text-base font-semibold text-[hsl(210_40%_98%)]">
          {t('assistant.manualViewer.title', {
            page: citation.page,
            section: formatCitationSection(citation),
          })}
        </h2>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('assistant.modal.close')}
        </Button>
      </div>
      <iframe
        title={t('assistant.manualViewer.iframeTitle', { page: citation.page })}
        src={getCitationPdfUrl(citation)}
        className="h-full w-full border-0 bg-white"
        data-testid="manual-viewer-iframe"
      />
    </div>
  );
}

interface CitationChipProps {
  citation: Citation;
}

export function CitationChip({ citation }: CitationChipProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const section = formatCitationSection(citation);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
        className="inline-flex min-h-12 items-center rounded-full border border-[hsl(217_33%_22%)] bg-[hsl(217_33%_17%)] px-4 py-2 text-left text-sm text-[hsl(210_40%_98%)] transition-colors hover:bg-[hsl(217_33%_22%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(217_91%_60%)]"
        aria-label={t('assistant.citation.openManual', { page: citation.page, section })}
        data-testid={`citation-chip-${String(citation.page)}`}
      >
        {t('assistant.citation.label', { page: citation.page, section })}
      </button>
      {isOpen ? (
        <ManualViewerModal
          citation={citation}
          onClose={() => {
            setIsOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

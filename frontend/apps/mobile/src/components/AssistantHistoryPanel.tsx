import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { AssistantHistoryEntry } from '@superion/domain';
import { Button } from '@superion/ui';

import { AssistantHistoryList } from './AssistantHistoryList';

interface AssistantHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  entries: AssistantHistoryEntry[];
}

export function AssistantHistoryPanel({ open, onClose, entries }: AssistantHistoryPanelProps) {
  const { t } = useTranslation();
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" data-testid="assistant-history-panel">
      <div
        role="presentation"
        className="absolute inset-0 bg-[hsl(222_47%_6%/0.72)]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[hsl(217_33%_17%)] bg-[hsl(222_47%_6%)] motion-safe:animate-[slide-in-right_250ms_ease-out]"
      >
        <div className="flex items-center justify-between border-b border-[hsl(217_33%_17%)] p-4">
          <h2 id={titleId} className="text-lg font-semibold text-[hsl(210_40%_98%)]">
            {t('assistant.historyTitle')}
          </h2>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('assistant.history.close')}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <AssistantHistoryList entries={entries} />
        </div>
      </aside>
    </div>
  );
}

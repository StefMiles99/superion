import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Skeleton } from '@superion/ui';

import { useAskAssistant } from '../hooks/useAskAssistant';
import { AssistantAnswerCard } from './AssistantAnswerCard';

interface AskAssistantModalProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

export function AskAssistantModal({ sessionId, open, onClose }: AskAssistantModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState('');
  const { mutate, reset, isPending, data, error } = useAskAssistant(sessionId);

  useEffect(() => {
    if (!open) {
      setQuestion('');
      reset();
      return;
    }

    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, reset]);

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

  const handleSubmit = () => {
    const trimmed = question.trim();
    if (!trimmed || isPending) {
      return;
    }

    mutate(trimmed);
  };

  if (!open) {
    return null;
  }

  const hasError = error instanceof Error;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="ask-assistant-modal">
      <div
        role="presentation"
        className="absolute inset-0 bg-[hsl(222_47%_6%/0.72)]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_6%)] shadow-2xl motion-safe:animate-[slide-up_250ms_ease-out]"
      >
        <div className="flex items-center justify-between border-b border-[hsl(217_33%_17%)] p-4">
          <h2 id={titleId} className="text-lg font-semibold text-[hsl(210_40%_98%)]">
            {t('assistant.modal.title')}
          </h2>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('assistant.modal.close')}
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label htmlFor="assistant-question" className="sr-only">
            {t('assistant.modal.inputLabel')}
          </label>
          <textarea
            ref={textareaRef}
            id="assistant-question"
            name="question"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
            }}
            placeholder={t('assistant.modal.placeholder')}
            rows={4}
            disabled={isPending}
            className="min-h-14 w-full rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] px-3 py-3 text-base text-[hsl(210_40%_98%)] placeholder:text-[hsl(215_20%_55%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(217_91%_60%)] disabled:opacity-50"
          />

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="min-h-12 min-w-12"
              aria-label={t('assistant.modal.voicePlaceholder')}
              disabled
            >
              {t('assistant.modal.voiceIcon')}
            </Button>
            <Button
              type="button"
              className="min-h-14 flex-1 text-base"
              onClick={handleSubmit}
              disabled={!question.trim() || isPending}
              aria-busy={isPending}
            >
              {t('assistant.modal.submit')}
            </Button>
          </div>

          {isPending ? (
            <div className="space-y-3" data-testid="assistant-loading">
              <p className="text-sm text-[hsl(215_20%_65%)]">{t('assistant.modal.loading')}</p>
              <Skeleton height="4rem" className="w-full" />
              <Skeleton height="2.5rem" className="w-2/3" />
            </div>
          ) : null}

          {hasError ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-[hsl(0_84%_60%/0.4)] bg-[hsl(0_84%_60%/0.1)] p-3 text-sm text-[hsl(0_84%_70%)]"
            >
              {t('assistant.modal.error')}
            </div>
          ) : null}

          {data ? <AssistantAnswerCard answer={data} /> : null}
        </div>
      </div>
    </div>
  );
}

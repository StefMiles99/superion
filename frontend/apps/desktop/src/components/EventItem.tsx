import { useTranslation } from 'react-i18next';

import type { WsEvent } from '@superion/domain';
import type { AssistantAnsweredPayload, EventAppendedPayload } from '@superion/ws-client';

interface EventItemProps {
  event: WsEvent;
  selected: boolean;
  onSelect: () => void;
  onOpenCitation?: (page: number, sectionPath: string) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStepIndex(payload: unknown): number | null {
  if (!isRecord(payload)) {
    return null;
  }
  return typeof payload.step_index === 'number' ? payload.step_index : null;
}

function formatTimestamp(value: string | undefined, locale: string): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function getEventIcon(type: string, payload: unknown): string {
  if (type === 'event.appended' && isRecord(payload)) {
    if (payload.type === 'utterance') {
      return '🎤';
    }
    if (payload.type === 'command') {
      return '⌘';
    }
  }
  if (type.startsWith('assistant.')) {
    return '🤖';
  }
  if (type.startsWith('photo.')) {
    return '📷';
  }
  if (type.startsWith('step.')) {
    return '📋';
  }
  return '•';
}

export function EventItem({ event, selected, onSelect, onOpenCitation }: EventItemProps) {
  const { t, i18n } = useTranslation();
  const payload = event.payload;
  const icon = getEventIcon(event.type, payload);
  const timestamp = formatTimestamp(event.created_at, i18n.language);

  let label = t(`sessionDetail.events.${event.type}`, { defaultValue: event.type });
  let body: string | null = null;
  let citations: AssistantAnsweredPayload['citations'] = [];

  if (event.type === 'event.appended' && isRecord(payload)) {
    const appended = payload as EventAppendedPayload;
    if (appended.type === 'utterance' && typeof appended.text === 'string') {
      label = t('sessionDetail.events.utterance');
      body = appended.text;
    }
    if (appended.type === 'command' && typeof appended.text === 'string') {
      label = t('sessionDetail.events.command');
      body = appended.text;
    }
  }

  if (event.type === 'assistant.answered' && isRecord(payload)) {
    const answered = payload as unknown as AssistantAnsweredPayload;
    label = t('sessionDetail.events.assistantAnswered');
    body = answered.answer_text;
    citations = answered.citations ?? [];
  }

  if (event.type === 'photo.validated' && isRecord(payload) && typeof payload.caption === 'string') {
    body = payload.caption;
  }

  if (event.type === 'photo.rejected' && isRecord(payload) && typeof payload.feedback === 'string') {
    body = payload.feedback;
  }

  const stepIndex = readStepIndex(payload);

  return (
    <button
      type="button"
      data-testid="event-item"
      data-seq={event.seq}
      data-selected={selected ? 'true' : 'false'}
      className={
        selected
          ? 'flex w-full gap-3 rounded-md border border-[hsl(217_91%_60%)] bg-[hsl(217_91%_60%/0.1)] px-3 py-2 text-left'
          : 'flex w-full gap-3 rounded-md px-3 py-2 text-left hover:bg-[hsl(217_33%_12%)]'
      }
      onClick={onSelect}
    >
      <span className="w-6 shrink-0 text-center" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-xs text-[hsl(215_20%_50%)]">
          <span>{label}</span>
          <time dateTime={event.created_at ?? undefined}>{timestamp}</time>
        </span>
        {body ? (
          <span className="mt-1 block text-sm text-[hsl(215_20%_75%)]" aria-live="polite">
            {body}
          </span>
        ) : null}
        {stepIndex !== null ? (
          <span className="mt-1 block text-xs text-[hsl(215_20%_50%)]">
            {t('sessionDetail.stepNumber', { number: stepIndex + 1 })}
          </span>
        ) : null}
        {citations.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-2">
            {citations.map((citation) => (
              <button
                key={citation.chunk_id}
                type="button"
                data-testid="citation-chip"
                className="rounded-full border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] px-2 py-0.5 text-xs text-[hsl(217_91%_70%)] hover:bg-[hsl(217_33%_17%)]"
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onOpenCitation?.(citation.page, citation.section_path);
                }}
              >
                {t('sessionDetail.citationChip', {
                  page: citation.page,
                  section: citation.section_path,
                })}
              </button>
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
}

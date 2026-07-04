import { useTranslation } from 'react-i18next';

import type { WsEvent } from '@superion/domain';

interface TimelineScrubberProps {
  events: WsEvent[];
  selectedSeq: number | null;
  onSelectSeq: (seq: number) => void;
}

const KEY_EVENT_TYPES = new Set([
  'step.entered',
  'step.completed',
  'assistant.answered',
  'photo.validated',
  'photo.rejected',
  'event.appended',
]);

function isKeyEvent(event: WsEvent): boolean {
  if (!KEY_EVENT_TYPES.has(event.type)) {
    return false;
  }

  if (event.type === 'event.appended') {
    const payload = event.payload;
    if (typeof payload === 'object' && payload !== null) {
      const type = (payload as Record<string, unknown>).type;
      return type === 'utterance' || type === 'command';
    }
    return false;
  }

  return true;
}

export function TimelineScrubber({ events, selectedSeq, onSelectSeq }: TimelineScrubberProps) {
  const { t } = useTranslation();
  const markers = events.filter(isKeyEvent);

  if (markers.length === 0) {
    return null;
  }

  const firstTime = new Date(markers[0]?.created_at ?? Date.now()).getTime();
  const lastTime = new Date(markers[markers.length - 1]?.created_at ?? Date.now()).getTime();
  const span = Math.max(lastTime - firstTime, 1);

  return (
    <div
      className="relative h-10 rounded-md border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_6%)] px-2"
      data-testid="timeline-scrubber"
      aria-label={t('sessionDetail.timeline')}
    >
      <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-[hsl(217_33%_22%)]" />
      {markers.map((event) => {
        const time = new Date(event.created_at ?? Date.now()).getTime();
        const position = ((time - firstTime) / span) * 100;
        const selected = selectedSeq === event.seq;

        return (
          <button
            key={String(event.seq)}
            type="button"
            title={event.type}
            aria-label={t('sessionDetail.timelineMarker', { type: event.type })}
            className={
              selected
                ? 'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(217_91%_60%)] ring-2 ring-[hsl(217_91%_60%/0.35)]'
                : 'absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(215_20%_50%)] hover:bg-[hsl(217_91%_60%)]'
            }
            style={{ left: `${String(Math.min(Math.max(position, 2), 98))}%` }}
            onClick={() => {
              if (typeof event.seq === 'number') {
                onSelectSeq(event.seq);
              }
            }}
          />
        );
      })}
    </div>
  );
}

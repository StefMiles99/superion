import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import type { WsEvent } from '@superion/domain';

import { EventItem } from './EventItem';

interface EventStreamProps {
  events: WsEvent[];
  selectedSeq: number | null;
  onSelectEvent: (event: WsEvent) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onOpenCitation?: (page: number, sectionPath: string) => void;
}

export function EventStream({
  events,
  selectedSeq,
  onSelectEvent,
  onLoadMore,
  hasMore,
  onOpenCitation,
}: EventStreamProps) {
  const { t } = useTranslation();
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  return (
    <section
      className="flex min-h-0 flex-col rounded-md border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_6%)]"
      aria-label={t('sessionDetail.eventStream')}
      data-testid="event-stream"
    >
      <header className="border-b border-[hsl(217_33%_17%)] px-3 py-2 text-sm font-medium">
        {t('sessionDetail.eventStream')}
      </header>
      <div className="min-h-[220px] flex-1">
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: 300 }}
          data={events}
          endReached={() => {
            if (hasMore) {
              onLoadMore();
            }
          }}
          itemContent={(_index, event) => (
            <div className="px-2 py-1">
              <EventItem
                event={event}
                selected={selectedSeq === event.seq}
                onSelect={() => onSelectEvent(event)}
                {...(onOpenCitation ? { onOpenCitation } : {})}
              />
            </div>
          )}
        />
      </div>
    </section>
  );
}

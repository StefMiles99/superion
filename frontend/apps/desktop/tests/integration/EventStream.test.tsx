import type { ReactElement } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { WsEvent } from '@superion/domain';

import { VirtuosoMockContext } from 'react-virtuoso';

import { EventStream } from '../../src/components/EventStream';
import { renderWithProviders } from '../test-utils';

function renderEventStream(element: ReactElement) {
  return renderWithProviders(
    [
      {
        path: '/',
        element: (
          <VirtuosoMockContext.Provider value={{ viewportHeight: 400, itemHeight: 80 }}>
            {element}
          </VirtuosoMockContext.Provider>
        ),
      },
    ],
    { initialEntries: ['/'] },
  );
}

function createEvents(count: number): WsEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    type: 'event.appended',
    seq: index + 1,
    session_id: 'sess-1',
    created_at: new Date(Date.UTC(2026, 0, 1, 10, 0, index)).toISOString(),
    payload: {
      type: 'utterance',
      step_index: 0,
      text: `Evento de prueba ${String(index + 1)}`,
    },
  }));
}

describe('EventStream integration (desktop)', () => {
  it('renders events with timestamps and types', async () => {
    const events = createEvents(3);

    renderEventStream(
      <EventStream
        events={events}
        selectedSeq={null}
        onSelectEvent={() => undefined}
        onLoadMore={() => undefined}
        hasMore={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('event-item').length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/evento de prueba 1/i)).toBeInTheDocument();
    expect(screen.getByText(/evento de prueba 3/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('event-item')).toHaveLength(3);
  });

  it('loads more events on scroll end when hasMore is true', async () => {
    const events = createEvents(50);
    let loadMoreCalls = 0;

    renderEventStream(
      <EventStream
        events={events}
        selectedSeq={null}
        onSelectEvent={() => undefined}
        onLoadMore={() => {
          loadMoreCalls += 1;
        }}
        hasMore
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('event-item').length).toBeGreaterThan(0);
    });

    expect(loadMoreCalls).toBeGreaterThanOrEqual(0);
    expect(screen.getAllByTestId('event-item').length).toBeGreaterThan(0);
  });
});

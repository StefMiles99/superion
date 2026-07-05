import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RealWsClient } from '../src/ws';

type MessageListener = ((event: { data: string }) => void) | null;
type CloseListener = ((event: { code: number }) => void) | null;
type OpenListener = (() => void) | null;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static shouldFailNext = false;

  onopen: OpenListener = null;
  onmessage: MessageListener = null;
  onclose: CloseListener = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  readonly sent: string[] = [];

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
    if (MockWebSocket.shouldFailNext) {
      MockWebSocket.shouldFailNext = false;
      queueMicrotask(() => {
        this.onerror?.();
        this.onclose?.({ code: 1006 });
      });
      return;
    }

    queueMicrotask(() => {
      this.readyState = 1;
      this.onopen?.();
    });
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }

  static reset(): void {
    MockWebSocket.instances = [];
    MockWebSocket.shouldFailNext = false;
  }
}

describe('RealWsClient reconnect', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reconnects with catch-up after disconnect', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            seq: 5,
            type: 'step.completed',
            session_id: 'sess-1',
            created_at: '2026-01-01T00:00:00.000Z',
            payload: { index: 0 },
          },
        ],
        next_cursor: null,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RealWsClient('ws://localhost:8000', 'http://localhost:8000');
    const received: string[] = [];
    const states: string[] = [];

    client.onConnectionStateChange!((state) => {
      states.push(state);
    });
    client.subscribe('*', (event) => {
      received.push(event.type);
    });

    await client.connect('sess-1', 'token-abc', 4);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/v1/sessions/sess-1/events?since_seq=4&limit=500',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-abc' },
      }),
    );
    expect(MockWebSocket.instances[0]?.url).toContain('last_seq=5');

    const firstSocket = MockWebSocket.instances[0]!;
    firstSocket.close(1006);

    await vi.advanceTimersByTimeAsync(2_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(states).toContain('reconnecting');
    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2);

    const secondSocket = MockWebSocket.instances.at(-1)!;
    expect(secondSocket.url).toContain('last_seq=5');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    secondSocket.simulateMessage(
      JSON.stringify({
        seq: 6,
        type: 'step.entered',
        session_id: 'sess-1',
        created_at: '2026-01-01T00:00:01.000Z',
        payload: { index: 1 },
      }),
    );

    expect(received).toContain('step.completed');
    expect(received).toContain('step.entered');
  });
});

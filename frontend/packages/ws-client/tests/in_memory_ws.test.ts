import { describe, expect, it } from 'vitest';

import type { WsEvent } from '@superion/domain';

import { InMemoryWsClient } from '../src/in_memory';

describe('InMemoryWsClient', () => {
  it('delivers emitted events to subscribers', async () => {
    const client = new InMemoryWsClient();
    const received: WsEvent[] = [];

    await client.connect('sess-1', 'token-1');
    client.subscribe('*', (event) => {
      received.push(event);
    });

    const event: WsEvent = {
      seq: 1,
      type: 'session.started',
      session_id: 'sess-1',
      created_at: new Date().toISOString(),
      payload: { id: 'sess-1' },
    };
    client.emit!(event);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);
  });

  it('filters events by pattern', async () => {
    const client = new InMemoryWsClient();
    const stepEvents: WsEvent[] = [];
    const photoEvents: WsEvent[] = [];

    await client.connect('sess-1', 'token-1');
    client.subscribe('step.*', (event) => {
      stepEvents.push(event);
    });
    client.subscribe('photo.*', (event) => {
      photoEvents.push(event);
    });

    client.emit!({
      seq: 2,
      type: 'step.entered',
      session_id: 'sess-1',
      created_at: new Date().toISOString(),
      payload: { index: 1 },
    });
    client.emit!({
      seq: 3,
      type: 'photo.captured',
      session_id: 'sess-1',
      created_at: new Date().toISOString(),
      payload: { photo_id: 'p-1' },
    });

    expect(stepEvents).toHaveLength(1);
    expect(photoEvents).toHaveLength(1);
  });

  it('unsubscribes handler when cleanup is called', async () => {
    const client = new InMemoryWsClient();
    const received: WsEvent[] = [];

    await client.connect('sess-1', 'token-1');
    const unsubscribe = client.subscribe('*', (event) => {
      received.push(event);
    });
    unsubscribe();

    client.emit!({ type: 'ping', payload: null });
    expect(received).toHaveLength(0);
  });

  it('does not emit when disconnected', async () => {
    const client = new InMemoryWsClient();
    const received: WsEvent[] = [];

    client.subscribe('*', (event) => {
      received.push(event);
    });
    client.emit!({ type: 'ping', payload: null });

    expect(received).toHaveLength(0);
  });

  it('reports reconnecting state after disconnect', async () => {
    const client = new InMemoryWsClient();
    const states: string[] = [];

    client.onConnectionStateChange!((state) => {
      states.push(state);
    });

    await client.connect('sess-1', 'token-1');
    await client.disconnect();

    expect(states).toContain('open');
    expect(client.getConnectionState!()).toBe('reconnecting');
  });
});

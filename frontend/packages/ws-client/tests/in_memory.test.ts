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

    const event: WsEvent = { type: 'session.started', payload: { id: 'sess-1' } };
    client.emit!(event);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);
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
});

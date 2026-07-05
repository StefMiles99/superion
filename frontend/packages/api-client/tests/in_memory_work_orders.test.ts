import { describe, expect, it } from 'vitest';

import { InMemoryApiClient } from '../src/in_memory';

describe('InMemoryApiClient.listWorkOrders', () => {
  it('returns five seeded work orders by default', async () => {
    const client = new InMemoryApiClient();
    const result = await client.listWorkOrders();

    expect(result.items).toHaveLength(5);
    expect(result.items.map((item) => item.code)).toEqual([
      'OT-1234',
      'OT-1235',
      'OT-1236',
      'OT-1237',
      'OT-1238',
    ]);
    expect(result.nextCursor).toBeNull();
  });

  it('filters by status', async () => {
    const client = new InMemoryApiClient();
    const result = await client.listWorkOrders({ status: 'pending' });

    expect(result.items).toHaveLength(3);
    expect(result.items.every((item) => item.status === 'pending')).toBe(true);
  });

  it('filters by priority', async () => {
    const client = new InMemoryApiClient();
    const result = await client.listWorkOrders({ priority: 'high' });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((item) => item.priority === 'high')).toBe(true);
  });

  it('filters by search query against code or asset tag', async () => {
    const client = new InMemoryApiClient();
    const byCode = await client.listWorkOrders({ q: '1236' });
    const byTag = await client.listWorkOrders({ q: 'comp-c3' });

    expect(byCode.items).toHaveLength(1);
    expect(byCode.items[0]?.code).toBe('OT-1236');
    expect(byTag.items).toHaveLength(1);
    expect(byTag.items[0]?.code).toBe('OT-1234');
  });

  it('paginates with cursor', async () => {
    const client = new InMemoryApiClient();
    const firstPage = await client.listWorkOrders({ limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).toBe('2');

    const secondPage = await client.listWorkOrders({
      limit: 2,
      ...(firstPage.nextCursor ? { cursor: firstPage.nextCursor } : {}),
    });
    expect(secondPage.items).toHaveLength(2);
    expect(secondPage.items[0]?.code).toBe('OT-1236');
    expect(secondPage.nextCursor).toBe('4');

    const lastPage = await client.listWorkOrders({
      limit: 2,
      ...(secondPage.nextCursor ? { cursor: secondPage.nextCursor } : {}),
    });
    expect(lastPage.items).toHaveLength(1);
    expect(lastPage.nextCursor).toBeNull();
  });

  it('throws when listWorkOrders error simulation is enabled', async () => {
    const client = new InMemoryApiClient();
    client.setListWorkOrdersError(true);

    await expect(client.listWorkOrders()).rejects.toThrow('Error simulado al listar OTs');
  });
});

import { describe, expect, it } from 'vitest';

import { InMemoryApiClient } from '../src/in_memory';

describe('InMemoryApiClient', () => {
  it('requires authentication for me()', async () => {
    const client = new InMemoryApiClient();
    await expect(client.me()).rejects.toThrow('No autenticado');
  });

  it('returns work orders list', async () => {
    const client = new InMemoryApiClient();
    const result = await client.listWorkOrders();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.code).toBe('OT-1234');
    expect(result.nextCursor).toBeNull();
  });

  it('reset restores fixtures without error', () => {
    const client = new InMemoryApiClient();
    expect(() => client.reset()).not.toThrow();
  });
});

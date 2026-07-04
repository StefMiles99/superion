import { describe, expect, it } from 'vitest';

import { InMemoryApiClient } from '../src/in_memory';

describe('InMemoryApiClient', () => {
  it('returns fixture user from getCurrentUser', async () => {
    const client = new InMemoryApiClient();
    const user = await client.getCurrentUser();

    expect(user.email).toBe('juan@planta.com');
    expect(user.fullName).toBe('Juan Pérez');
    expect(user.role).toBe('technician');
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
    expect(() => client.reset?.()).not.toThrow();
  });
});

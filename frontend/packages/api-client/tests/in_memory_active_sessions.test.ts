import { describe, expect, it } from 'vitest';

import { AuthError } from '@superion/domain';

import { InMemoryApiClient } from '../src/in_memory';

const PLANT_ID = '660e8400-e29b-41d4-a716-446655440001';
const OTHER_PLANT_ID = '770e8400-e29b-41d4-a716-446655440099';

describe('InMemoryApiClient.listActiveSessions', () => {
  it('returns 3 active, 1 paused and 1 recently finalized for the plant', async () => {
    const client = new InMemoryApiClient();
    await client.login({ email: 'ana@planta.com', password: 'test1234' });

    const sessions = await client.listActiveSessions(PLANT_ID);

    expect(sessions.length).toBeGreaterThanOrEqual(5);
    expect(sessions.filter((item) => item.status === 'active')).toHaveLength(3);
    expect(sessions.filter((item) => item.status === 'paused')).toHaveLength(1);
    expect(sessions.filter((item) => item.status === 'finalized')).toHaveLength(1);
    sessions.forEach((item) => {
      expect(item.plantId).toBe(PLANT_ID);
    });
  });

  it('returns empty list for unknown plant', async () => {
    const client = new InMemoryApiClient();
    await client.login({ email: 'ana@planta.com', password: 'test1234' });

    const sessions = await client.listActiveSessions(OTHER_PLANT_ID);
    expect(sessions).toEqual([]);
  });

  it('rejects unauthenticated requests', async () => {
    const client = new InMemoryApiClient();

    await expect(client.listActiveSessions(PLANT_ID)).rejects.toThrow(AuthError);
  });

  it('reflects remote pause in listActiveSessions', async () => {
    const client = new InMemoryApiClient();
    await client.login({ email: 'ana@planta.com', password: 'test1234' });

    const before = await client.listActiveSessions(PLANT_ID);
    const active = before.find((item) => item.status === 'active');
    expect(active).toBeDefined();

    await client.pauseSession(active!.id);

    const after = await client.listActiveSessions(PLANT_ID);
    const paused = after.find((item) => item.id === active!.id);
    expect(paused?.status).toBe('paused');
  });
});

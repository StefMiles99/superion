import { describe, expect, it } from 'vitest';

import { AuthError } from '@superion/domain';

import { createMockJwt, InMemoryApiClient } from '../src/in_memory';

describe('InMemoryApiClient auth', () => {
  const fixedNow = 1_700_000_000_000;

  it('login succeeds with valid credentials', async () => {
    const client = new InMemoryApiClient();
    client.setClock(() => fixedNow);

    const response = await client.login({
      email: 'juan@planta.com',
      password: 'test1234',
    });

    expect(response.user.email).toBe('juan@planta.com');
    expect(response.user.role).toBe('technician');
    expect(response.accessToken).toContain('.');
    expect(response.refreshToken).toContain('v1.mock.');
    expect(response.expiresIn).toBe(3600);

    const me = await client.me();
    expect(me.email).toBe('juan@planta.com');
  });

  it('mock JWT contains correct claims', async () => {
    const client = new InMemoryApiClient();
    client.setClock(() => fixedNow);

    const response = await client.login({
      email: 'juan@planta.com',
      password: 'test1234',
    });

    const [, payloadPart] = response.accessToken.split('.');
    expect(payloadPart).toBeDefined();
    const payload = JSON.parse(
      Buffer.from(payloadPart!, 'base64').toString('utf-8'),
    ) as {
      sub: string;
      email: string;
      role: string;
      plant_id: string;
      exp: number;
    };

    expect(payload.sub).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(payload.email).toBe('juan@planta.com');
    expect(payload.role).toBe('technician');
    expect(payload.plant_id).toBe('660e8400-e29b-41d4-a716-446655440001');
    expect(payload.exp).toBe(Math.floor(fixedNow / 1000) + 3600);
  });

  it('rejects invalid credentials', async () => {
    const client = new InMemoryApiClient();

    await expect(
      client.login({ email: 'juan@planta.com', password: 'wrong' }),
    ).rejects.toThrow(AuthError);

    await expect(client.me()).rejects.toThrow(AuthError);
  });

  it('refresh returns new tokens', async () => {
    const client = new InMemoryApiClient();
    client.setClock(() => fixedNow);

    const login = await client.login({
      email: 'ana@planta.com',
      password: 'test1234',
    });

    const refreshed = await client.refresh({ refreshToken: login.refreshToken });

    expect(refreshed.user.role).toBe('supervisor');
    expect(refreshed.accessToken).toContain('.');
    expect(refreshed.refreshToken).toBe(login.refreshToken);
  });

  it('logout clears session', async () => {
    const client = new InMemoryApiClient();

    await client.login({ email: 'juan@planta.com', password: 'test1234' });
    await client.logout();

    await expect(client.me()).rejects.toThrow(AuthError);
  });

  it('createMockJwt signature is base64 of mock-signature', () => {
    const token = createMockJwt(
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'juan@planta.com',
        fullName: 'Juan Pérez',
        role: 'technician',
        plantId: '660e8400-e29b-41d4-a716-446655440001',
      },
      3600,
      fixedNow,
    );

    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[2]).toBe(Buffer.from('mock-signature').toString('base64'));
  });
});

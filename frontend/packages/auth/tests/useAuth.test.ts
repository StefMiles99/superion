import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryApiClient } from '@superion/api-client';

import { AUTH_STORAGE_KEY, useAuthStore } from '../src/useAuth';

describe('useAuth store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ session: null, isAuthenticated: false });
  });

  it('transitions from logged out to logged in on setSession', async () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();

    const client = new InMemoryApiClient();
    const login = await client.login({
      email: 'juan@planta.com',
      password: 'test1234',
    });

    act(() => {
      result.current.setSession({
        accessToken: login.accessToken,
        refreshToken: login.refreshToken,
        expiresAt: Date.now() + login.expiresIn * 1000,
        user: login.user,
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session?.user.email).toBe('juan@planta.com');
  });

  it('transitions from logged in to logged out on clearSession', async () => {
    const { result } = renderHook(() => useAuthStore());
    const client = new InMemoryApiClient();
    const login = await client.login({
      email: 'juan@planta.com',
      password: 'test1234',
    });

    act(() => {
      result.current.setSession({
        accessToken: login.accessToken,
        refreshToken: login.refreshToken,
        expiresAt: Date.now() + login.expiresIn * 1000,
        user: login.user,
      });
    });

    act(() => {
      result.current.clearSession();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('persists session in localStorage under superion.auth', async () => {
    const { result } = renderHook(() => useAuthStore());
    const client = new InMemoryApiClient();
    const login = await client.login({
      email: 'juan@planta.com',
      password: 'test1234',
    });

    act(() => {
      result.current.setSession({
        accessToken: login.accessToken,
        refreshToken: login.refreshToken,
        expiresAt: Date.now() + login.expiresIn * 1000,
        user: login.user,
      });
    });

    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    expect(stored).toContain('accessToken');
    expect(stored).toContain('juan@planta.com');
  });
});

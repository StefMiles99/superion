import { describe, expect, it } from 'vitest';

import {
  AuthError,
  createAuthSession,
  getDefaultRouteForRole,
  isAuthSessionValid,
  type AuthSession,
} from '../src/entities/auth';
import type { User } from '../src/entities/user';

const validUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'juan@planta.com',
  fullName: 'Juan Pérez',
  role: 'technician',
  plantId: '660e8400-e29b-41d4-a716-446655440001',
};

const baseSession: AuthSession = {
  accessToken: 'eyJ.mock.token',
  refreshToken: 'v1.mock.refresh',
  expiresAt: 1_700_000_000_000,
  user: validUser,
};

describe('AuthSession invariants', () => {
  it('is valid when expiresAt is in the future and tokens are present', () => {
    const now = 1_699_999_000_000;
    expect(isAuthSessionValid(baseSession, now)).toBe(true);
  });

  it('is invalid when expiresAt is in the past', () => {
    const now = 1_700_000_000_001;
    expect(isAuthSessionValid(baseSession, now)).toBe(false);
  });

  it('is invalid when accessToken is empty', () => {
    const now = 1_699_999_000_000;
    expect(isAuthSessionValid({ ...baseSession, accessToken: '' }, now)).toBe(false);
  });

  it('is invalid when refreshToken is empty', () => {
    const now = 1_699_999_000_000;
    expect(isAuthSessionValid({ ...baseSession, refreshToken: '' }, now)).toBe(false);
  });

  it('creates session with correct expiresAt from expiresIn', () => {
    const now = 1_000_000;
    const session = createAuthSession(
      {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
        user: validUser,
      },
      now,
    );
    expect(session.expiresAt).toBe(now + 3_600_000);
    expect(session.user.email).toBe('juan@planta.com');
  });
});

describe('getDefaultRouteForRole', () => {
  it('routes technician to work-orders', () => {
    expect(getDefaultRouteForRole('technician')).toBe('/work-orders');
  });

  it('routes supervisor to dashboard', () => {
    expect(getDefaultRouteForRole('supervisor')).toBe('/dashboard');
  });

  it('routes rag_admin to manuals', () => {
    expect(getDefaultRouteForRole('rag_admin')).toBe('/manuals');
  });
});

describe('AuthError', () => {
  it('has name AuthError', () => {
    const error = new AuthError('invalid credentials');
    expect(error.name).toBe('AuthError');
    expect(error.message).toBe('invalid credentials');
  });
});

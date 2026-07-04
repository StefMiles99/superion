import type { User } from './user';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export function isAuthSessionValid(session: AuthSession, now: number): boolean {
  return (
    session.accessToken.length > 0 &&
    session.refreshToken.length > 0 &&
    session.expiresAt > now &&
    session.user.id.length > 0
  );
}

export function createAuthSession(
  response: LoginResponse,
  now: number,
): AuthSession {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: now + response.expiresIn * 1000,
    user: response.user,
  };
}

export function getDefaultRouteForRole(role: User['role']): string {
  switch (role) {
    case 'technician':
      return '/work-orders';
    case 'supervisor':
      return '/dashboard';
    case 'rag_admin':
      return '/manuals';
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

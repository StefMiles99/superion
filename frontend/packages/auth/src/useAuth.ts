import { getApiClient } from '@superion/api-client';
import type { AuthSession } from '@superion/domain';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const AUTH_STORAGE_KEY = 'superion.auth';

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession | null) => void;
  clearSession: () => void;
}

function computeIsAuthenticated(session: AuthSession | null): boolean {
  if (!session) {
    return false;
  }
  return session.expiresAt > Date.now();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isAuthenticated: false,
      setSession: (session) =>
        set({
          session,
          isAuthenticated: computeIsAuthenticated(session),
        }),
      clearSession: () =>
        set({
          session: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }
        const valid = computeIsAuthenticated(state.session);
        state.isAuthenticated = valid;
        if (!valid) {
          state.session = null;
        }
        syncApiTokensFromSession();
      },
    },
  ),
);

export function useAuth() {
  const session = useAuthStore((state) => state.session);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return {
    session,
    user: session?.user ?? null,
    isAuthenticated,
    setSession,
    clearSession,
  };
}

export function syncApiTokensFromSession(): void {
  const session = useAuthStore.getState().session;
  const api = getApiClient();

  if (session && api.setTokens) {
    api.setTokens(session.accessToken, session.refreshToken);
    return;
  }

  if (api.setTokens) {
    api.setTokens(null, null);
  }
}

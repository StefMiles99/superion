import type { AuthSession, IStorage, UserProfile } from "@superion/domain";

const ACCESS = "superion.access_token";
const REFRESH = "superion.refresh_token";
const USER = "superion.user";

export interface TokenStore {
  getAccess(): string | null;
  getRefresh(): string | null;
  getUser(): UserProfile | null;
  save(session: AuthSession): void;
  setAccess(token: string): void;
  clear(): void;
}

export function createTokenStore(storage: IStorage): TokenStore {
  return {
    getAccess: () => storage.get(ACCESS),
    getRefresh: () => storage.get(REFRESH),
    getUser: () => {
      const raw = storage.get(USER);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as UserProfile;
      } catch {
        return null;
      }
    },
    save: (session) => {
      storage.set(ACCESS, session.access_token);
      storage.set(REFRESH, session.refresh_token);
      storage.set(USER, JSON.stringify(session.user));
    },
    setAccess: (token) => storage.set(ACCESS, token),
    clear: () => {
      storage.remove(ACCESS);
      storage.remove(REFRESH);
      storage.remove(USER);
    },
  };
}

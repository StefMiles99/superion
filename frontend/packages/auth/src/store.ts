import type { UserProfile } from "@superion/domain";
import { create } from "zustand";

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  clear: () => set({ user: null, isAuthenticated: false }),
}));

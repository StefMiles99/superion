import type { UserProfile } from "@superion/domain";

/** Roles con acceso al panel desktop (manuales RAG / supervisor). */
export const DESKTOP_ROLES = new Set<UserProfile["role"]>(["supervisor", "rag_admin"]);

export function canAccessDesktop(role: UserProfile["role"]): boolean {
  return DESKTOP_ROLES.has(role);
}

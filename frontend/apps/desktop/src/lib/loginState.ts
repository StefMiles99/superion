/** Estado de navegación al volver al login por rol no permitido. */
export type LoginLocationState = {
  roleDenied?: boolean;
};

export function readRoleDenied(state: unknown): boolean {
  return Boolean((state as LoginLocationState | null)?.roleDenied);
}

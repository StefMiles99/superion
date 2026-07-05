import type { IStorage } from "@superion/domain";

/** IStorage sobre window.localStorage (tolerante a entornos sin storage). */
export class BrowserStorage implements IStorage {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // storage no disponible
    }
  }

  remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // storage no disponible
    }
  }
}

/** IStorage en memoria — para tests y SSR. */
export class MemoryStorage implements IStorage {
  private map = new Map<string, string>();

  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  remove(key: string): void {
    this.map.delete(key);
  }
}

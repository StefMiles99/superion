import { getEnv } from '@superion/config';
import type { IApiClient } from '@superion/domain';

import { HttpApiClient } from './http';
import { InMemoryApiClient } from './in_memory';

let singleton: IApiClient | null = null;

export function getApiClient(): IApiClient {
  if (singleton) {
    return singleton;
  }

  const env = getEnv();
  if (env.VITE_API_MODE === 'mock') {
    singleton = new InMemoryApiClient();
    return singleton;
  }
  if (env.VITE_API_MODE === 'http') {
    singleton = new HttpApiClient(env.VITE_API_BASE_URL);
    return singleton;
  }

  throw new Error(`VITE_API_MODE=${String(env.VITE_API_MODE)} no soportado`);
}

export function resetApiClient(): void {
  singleton = null;
}

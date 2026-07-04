import { getEnv } from '@superion/config';
import type { IWsClient } from '@superion/domain';

import { InMemoryWsClient } from './in_memory';
import { RealWsClient } from './ws';

let singleton: IWsClient | null = null;

export function getWsClient(): IWsClient {
  if (singleton) {
    return singleton;
  }

  const env = getEnv();
  if (env.VITE_WS_MODE === 'mock') {
    singleton = new InMemoryWsClient();
    return singleton;
  }
  if (env.VITE_WS_MODE === 'real') {
    singleton = new RealWsClient(env.VITE_WS_BASE_URL);
    return singleton;
  }

  throw new Error(`VITE_WS_MODE=${String(env.VITE_WS_MODE)} no soportado`);
}

export function resetWsClient(): void {
  singleton = null;
}

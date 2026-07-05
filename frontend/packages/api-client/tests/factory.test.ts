import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@superion/config', () => ({
  getEnv: vi.fn(),
}));

import { getEnv } from '@superion/config';

import { getApiClient, resetApiClient } from '../src/factory';
import { HttpApiClient } from '../src/http';
import { InMemoryApiClient } from '../src/in_memory';

const mockedGetEnv = vi.mocked(getEnv);

afterEach(() => {
  resetApiClient();
  vi.clearAllMocks();
});

describe('getApiClient factory', () => {
  it('returns InMemoryApiClient when VITE_API_MODE is mock', () => {
    mockedGetEnv.mockReturnValue({
      VITE_API_MODE: 'mock',
      VITE_API_BASE_URL: 'http://localhost:8000',
      VITE_WS_BASE_URL: 'ws://localhost:8000',
      VITE_WS_MODE: 'mock',
      VITE_DEFAULT_LOCALE: 'es-ES',
      VITE_DEFAULT_THEME: 'dark',
      VITE_SENTRY_DSN: '',
      VITE_TELEMETRY_ENABLED: true,
      VITE_PWA_ENABLED: true,
      VITE_WEB_VITALS_ENDPOINT: '',
      VITE_PHOTO_MAX_SIZE_MB: 10,
      VITE_PHOTO_MAX_RETRIES: 3,
    });

    const client = getApiClient();
    expect(client).toBeInstanceOf(InMemoryApiClient);
  });

  it('returns HttpApiClient when VITE_API_MODE is http', () => {
    mockedGetEnv.mockReturnValue({
      VITE_API_MODE: 'http',
      VITE_API_BASE_URL: 'http://localhost:8000',
      VITE_WS_BASE_URL: 'ws://localhost:8000',
      VITE_WS_MODE: 'mock',
      VITE_DEFAULT_LOCALE: 'es-ES',
      VITE_DEFAULT_THEME: 'dark',
      VITE_SENTRY_DSN: '',
      VITE_TELEMETRY_ENABLED: true,
      VITE_PWA_ENABLED: true,
      VITE_WEB_VITALS_ENDPOINT: '',
      VITE_PHOTO_MAX_SIZE_MB: 10,
      VITE_PHOTO_MAX_RETRIES: 3,
    });

    const client = getApiClient();
    expect(client).toBeInstanceOf(HttpApiClient);
  });
});

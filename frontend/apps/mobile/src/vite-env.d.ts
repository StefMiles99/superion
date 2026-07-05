/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  readonly VITE_API_MODE: 'mock' | 'http';
  readonly VITE_WS_MODE: 'mock' | 'real';
  readonly VITE_DEFAULT_LOCALE: string;
  readonly VITE_DEFAULT_THEME: 'dark' | 'light';
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_TELEMETRY_ENABLED: string;
  readonly VITE_PWA_ENABLED: string;
  readonly VITE_WEB_VITALS_ENDPOINT: string;
  readonly VITE_PHOTO_MAX_SIZE_MB: string;
  readonly VITE_PHOTO_MAX_RETRIES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __superion?: {
    api: import('@superion/domain').IApiClient;
    ws: import('@superion/domain').IWsClient;
  };
  __mockWs?: import('@superion/domain').IWsClient;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  readonly VITE_API_MODE: 'mock' | 'http';
  readonly VITE_WS_MODE: 'mock' | 'real';
  readonly VITE_DEFAULT_LOCALE: string;
  readonly VITE_DEFAULT_THEME: 'dark' | 'light';
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_TELEMETRY_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

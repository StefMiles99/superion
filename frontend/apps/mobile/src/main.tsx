import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { getApiClient, InMemoryApiClient } from '@superion/api-client';
import { syncApiTokensFromSession } from '@superion/auth';
import { getEnv } from '@superion/config';
import { initI18n } from '@superion/i18n';
import { initTelemetry } from '@superion/telemetry';
import { getWsClient } from '@superion/ws-client';

import { App } from './App';
import './index.css';
import { registerServiceWorker } from './service-worker';

const env = getEnv();
const i18n = initI18n(env.VITE_DEFAULT_LOCALE);

initTelemetry({
  sentryDsn: env.VITE_SENTRY_DSN,
  enabled: env.VITE_TELEMETRY_ENABLED,
  apiBaseUrl: env.VITE_API_BASE_URL,
  webVitalsEndpoint: env.VITE_WEB_VITALS_ENDPOINT,
});

const api = getApiClient();
const ws = getWsClient();

if (api instanceof InMemoryApiClient && typeof ws.emit === 'function') {
  api.setPhotoEventEmitter((event) => {
    ws.emit?.(event);
  });
}

syncApiTokensFromSession();

if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  window.__superion = { api, ws };
  window.__mockWs = ws;
}

void registerServiceWorker(env.VITE_PWA_ENABLED);

window.addEventListener('online', () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    void navigator.serviceWorker.ready.then((registration) => {
      if ('sync' in registration) {
        void (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('photo-queue-sync');
      }
    });
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'photo-queue-sync') {
      window.dispatchEvent(new Event('online'));
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
);

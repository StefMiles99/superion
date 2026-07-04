import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { getApiClient } from '@superion/api-client';
import { syncApiTokensFromSession } from '@superion/auth';
import { getEnv } from '@superion/config';
import { initI18n } from '@superion/i18n';
import { getWsClient } from '@superion/ws-client';

import { App } from './App';
import './index.css';

const env = getEnv();
const i18n = initI18n(env.VITE_DEFAULT_LOCALE);

const api = getApiClient();
const ws = getWsClient();

syncApiTokensFromSession();

if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  window.__superion = { api, ws };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
);

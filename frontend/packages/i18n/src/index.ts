import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

export function initI18n(locale = 'es-ES'): typeof i18n {
  const language = locale.startsWith('es') ? 'es' : 'en';

  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: {
        es: { translation: es },
        en: { translation: en },
      },
      lng: language,
      fallbackLng: 'es',
      interpolation: { escapeValue: false },
    });
  } else {
    void i18n.changeLanguage(language);
  }

  return i18n;
}

export function formatDate(value: Date | string, locale = 'es-ES'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale).format(date);
}

export function formatNumber(value: number, locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale).format(value);
}

export { i18n };

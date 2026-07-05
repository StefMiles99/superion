import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { es, type Resources } from "./locales/es";

export const defaultNS = "translation";

export const resources = {
  "es-ES": { translation: es },
  "en-US": { translation: en },
} as const;

export function setupI18n(locale = "es-ES"): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: "es-ES",
      defaultNS,
      interpolation: { escapeValue: false },
    });
  } else {
    void i18n.changeLanguage(locale);
  }
  return i18n;
}

// Tipado fuerte de claves para useTranslation.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: Resources };
  }
}

export { useTranslation, Trans } from "react-i18next";
export type { Resources };
export default i18n;

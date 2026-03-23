import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import des fichiers de traduction
import frTranslation from './locales/fr.json';
import enTranslation from './locales/en.json';
import esTranslation from './locales/es.json';
import swTranslation from './locales/sw.json';
import mosTranslation from './locales/mos.json';
import haTranslation from './locales/ha.json';
import woTranslation from './locales/wo.json';

const resources = {
  fr: { translation: frTranslation },
  en: { translation: enTranslation },
  es: { translation: esTranslation },
  sw: { translation: swTranslation },
  mos: { translation: mosTranslation },
  ha: { translation: haTranslation },
  wo: { translation: woTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false, 
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

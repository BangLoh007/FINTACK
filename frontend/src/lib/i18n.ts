import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import th from '../locales/th.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      th: { translation: th },
    },
    lng: 'en',
    fallbackLng: 'th',
    supportedLngs: ['en', 'th'],
    load: 'languageOnly',
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'fintrack-language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n

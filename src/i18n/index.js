import { createI18n } from 'vue-i18n'
import en from './locales/en.js'
import he from './locales/he.js'

export const SUPPORTED_LOCALES = ['en', 'he']
export const RTL_LOCALES = ['he']

const savedLocale = localStorage.getItem('locale') || 'he'

const i18n = createI18n({
  legacy: false,            // use Composition API mode
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, he },
})

export default i18n

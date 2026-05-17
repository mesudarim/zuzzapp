/**
 * RTL / LTR utility
 *
 * Manages document direction and persists locale preference.
 * Call `applyLocale(locale)` whenever the user switches language.
 */

import { RTL_LOCALES } from '@/i18n'

/**
 * Returns true if the given locale is RTL.
 * @param {string} locale
 * @returns {boolean}
 */
export function isRTL(locale) {
  return RTL_LOCALES.includes(locale)
}

/**
 * Sets the `dir` attribute on <html>, persists the locale in localStorage,
 * and optionally triggers the i18n locale switch.
 *
 * @param {string} locale          - e.g. 'en' | 'he'
 * @param {import('vue-i18n').Composer} [i18n] - the i18n composer instance
 */
export function applyLocale(locale, i18n) {
  const dir = isRTL(locale) ? 'rtl' : 'ltr'

  document.documentElement.setAttribute('dir', dir)
  document.documentElement.setAttribute('lang', locale)
  localStorage.setItem('locale', locale)

  if (i18n) {
    i18n.locale.value = locale
  }
}

/**
 * Reads the persisted locale (or falls back to browser language / 'en')
 * and applies it immediately. Call once in main.js before mounting.
 *
 * @returns {string} the resolved locale
 */
export function initLocale() {
  const SUPPORTED = ['en', 'he']
  const stored = localStorage.getItem('locale')
  const browser = navigator.language?.split('-')[0]

  const locale = SUPPORTED.includes(stored)
    ? stored
    : SUPPORTED.includes(browser)
      ? browser
      : 'he'   // hébreu par défaut

  applyLocale(locale)
  return locale
}

import { useI18n } from 'vue-i18n'

/**
 * Returns a helper that resolves a multilingual field (object { en, fr, he, … })
 * or falls back gracefully if the field is still a plain string (legacy data).
 */
export function useLocalField() {
  const { locale } = useI18n()

  function localField(value, fallbackLocale = 'en') {
    if (!value) return ''
    if (typeof value === 'string') return value
    return (
      value[locale.value] ??
      value[fallbackLocale] ??
      Object.values(value)[0] ??
      ''
    )
  }

  return { localField }
}

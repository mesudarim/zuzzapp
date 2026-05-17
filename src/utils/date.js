/**
 * Date helpers — keeps Firestore Timestamps out of component logic.
 */

/** Returns today's date as "YYYY-MM-DD". */
export function todayISO() {
  return dateToISO(new Date())
}

/** Converts a JS Date (at local noon) to "YYYY-MM-DD" without UTC shift. */
export function dateToISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** @deprecated use dateToISO */
export function toISODate(value) {
  const d = value?.toDate ? value.toDate() : new Date(value)
  return dateToISO(d)
}

/** Formats "YYYY-MM-DD" to a human-readable locale string. */
export function formatDate(isoDate, locale = 'en') {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString(
    locale === 'he' ? 'he-IL' : 'en-US',
    { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
  )
}

/** Formats "HH:MM" to locale time display. */
export function formatTime(time, locale = 'en') {
  const [h, m] = time.split(':').map(Number)
  return new Date(0, 0, 0, h, m).toLocaleTimeString(
    locale === 'he' ? 'he-IL' : 'en-US',
    { hour: '2-digit', minute: '2-digit' }
  )
}

/**
 * Returns a new Date at local noon.
 * Use noon to avoid DST shift changing the calendar day.
 */
export function noon(d) {
  const copy = new Date(d)
  copy.setHours(12, 0, 0, 0)
  return copy
}

/** Returns a new Date shifted by n days (at noon). */
export function addDays(d, n) {
  const copy = noon(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

/** Returns a new Date shifted by n months, clamped to the 1st (at noon). */
export function addMonths(d, n) {
  const copy = noon(d)
  copy.setDate(1)
  copy.setMonth(copy.getMonth() + n)
  return copy
}

/**
 * Returns the Monday (startDay=1) or Sunday (startDay=0) of the week
 * containing d. Result is at local noon.
 */
export function getWeekStart(d, startDay = 1) {
  const copy = noon(d)
  const dow  = copy.getDay()               // 0=Sun…6=Sat
  const diff = (dow - startDay + 7) % 7
  copy.setDate(copy.getDate() - diff)
  return copy
}

/** Month name formatted from a Date, e.g. "April 2026" / "אפריל 2026". */
export function monthLabel(d, locale = 'en') {
  return d.toLocaleDateString(
    locale === 'he' ? 'he-IL' : 'en-US',
    { month: 'long', year: 'numeric' }
  )
}

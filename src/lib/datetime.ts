import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { BUSINESS } from './constants'

export const TZ = BUSINESS.timezone

/** A wall-clock date+time in Richmond -> the correct UTC instant, DST-aware. */
export function localToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}`, TZ)
}

/** The business date a UTC instant falls on, in Richmond. */
export function businessDate(instant: Date): string {
  return formatInTimeZone(instant, TZ, 'yyyy-MM-dd')
}

export function formatLocal(instant: Date, pattern: string) {
  return formatInTimeZone(instant, TZ, pattern)
}
export { toZonedTime }

/** Day of week (0 = Sunday) for a UTC instant, evaluated in Richmond. */
export function businessDow(instant: Date): number {
  return Number(formatInTimeZone(instant, TZ, 'i')) % 7
}

/**
 * A Richmond wall-clock `HH:mm` rendered for a reader.
 *
 * No timezone maths happens here — the value is already local, and
 * running it through a Date would invite exactly the offset bug this
 * module exists to prevent. It only picks the clock convention.
 */
export function formatWallTime(time: string, locale: 'es' | 'en'): string {
  const [h, m] = time.split(':').map(Number)
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const minutes = String(m).padStart(2, '0')
  if (locale === 'es') {
    return `${hour12}:${minutes} ${h < 12 ? 'a.m.' : 'p.m.'}`
  }
  return `${hour12}:${minutes} ${h < 12 ? 'AM' : 'PM'}`
}

/** Add whole days to a `yyyy-MM-dd` business date without touching a Date. */
export function addBusinessDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  // UTC arithmetic on a date-only value never crosses a DST boundary.
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

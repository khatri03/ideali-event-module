/**
 * The API serialises UTC timestamps with no offset suffix (`2026-03-02T02:00:00`), which `new Date`
 * would read as local time. Every timestamp from the API must come through here.
 */
export function parseUtcDateTime(value: string | null | undefined) {
  if (!value) return null

  const hasTimeZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  const date = new Date(hasTimeZone ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function localMidnight(calendarDate: string, dayOffset: number): Date | null {
  const parts = CALENDAR_DATE.exec(calendarDate.trim())
  if (!parts) return null

  const [, year, month, day] = parts
  const date = new Date(Number(year), Number(month) - 1, Number(day) + dayOffset)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * A `<input type="date">` value is a calendar date in the reader's own zone, but the API filters on
 * UTC instants. An organizer in Toronto asking for "March 1" means 05:00Z on March 1.
 */
export function startOfLocalDayAsUtcIso(calendarDate: string): string | null {
  return localMidnight(calendarDate, 0)?.toISOString() ?? null
}

/** The instant the chosen day ends locally, so the caller can compare with a strict `<`. */
export function endOfLocalDayAsUtcIso(calendarDate: string): string | null {
  return localMidnight(calendarDate, 1)?.toISOString() ?? null
}

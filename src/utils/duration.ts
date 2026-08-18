export const DURATION_UNITS = ["days", "hours", "minutes", "seconds"] as const

export type DurationUnit = (typeof DURATION_UNITS)[number]

export type DurationParts = Record<DurationUnit, number>

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR

/** A negative span is spent, not owed, so it reads as zero rather than counting backwards. */
export function splitDuration(milliseconds: number): DurationParts {
  const remaining = Math.max(0, Math.floor(milliseconds / MS_PER_SECOND)) * MS_PER_SECOND

  return {
    days: Math.floor(remaining / MS_PER_DAY),
    hours: Math.floor((remaining % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((remaining % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((remaining % MS_PER_MINUTE) / MS_PER_SECOND),
  }
}

/**
 * Which units are worth a card. A unit is dropped only while it and everything larger than it is zero,
 * so the set shrinks as the clock runs down and never grows back - a card that reappeared would shift
 * the row under an operator mid-count.
 */
export function visibleDurationUnits(parts: DurationParts): DurationUnit[] {
  const firstMeaningful = DURATION_UNITS.findIndex((unit) => parts[unit] > 0)

  return firstMeaningful === -1 ? ["seconds"] : DURATION_UNITS.slice(firstMeaningful)
}

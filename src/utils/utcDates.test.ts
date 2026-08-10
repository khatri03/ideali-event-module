import { describe, expect, it } from "vitest"
import { endOfLocalDayAsUtcIso, parseUtcDateTime, startOfLocalDayAsUtcIso } from "./utcDates"

describe("parseUtcDateTime", () => {
  /** The API omits the offset; reading that as local time is what shifted invoice dates by a day. */
  it("TimestampWithoutAnOffset_IsReadAsUtc", () => {
    expect(parseUtcDateTime("2026-03-02T02:00:00")?.toISOString()).toBe("2026-03-02T02:00:00.000Z")
  })

  it("TimestampAlreadyCarryingAnOffset_IsLeftAlone", () => {
    expect(parseUtcDateTime("2026-03-01T21:00:00-05:00")?.toISOString()).toBe("2026-03-02T02:00:00.000Z")
  })

  it.each([undefined, null, "", "not a date"])("UnusableValue_ReturnsNull", (value) => {
    expect(parseUtcDateTime(value)).toBeNull()
  })
})

describe("local day boundaries", () => {
  it("CalendarDate_StartsAtLocalMidnight", () => {
    const start = startOfLocalDayAsUtcIso("2026-03-01")

    expect(new Date(start as string).getTime()).toBe(new Date(2026, 2, 1).getTime())
  })

  /** Exclusive upper bound, so an invoice at 23:59 local on the chosen day still counts. */
  it("CalendarDate_EndsAtTheFollowingLocalMidnight", () => {
    const end = endOfLocalDayAsUtcIso("2026-03-01")

    expect(new Date(end as string).getTime()).toBe(new Date(2026, 2, 2).getTime())
  })

  it("SameDayRange_SpansTheWholeLocalDay", () => {
    const start = new Date(startOfLocalDayAsUtcIso("2026-03-01") as string)
    const end = new Date(endOfLocalDayAsUtcIso("2026-03-01") as string)
    const lateEvening = new Date(2026, 2, 1, 23, 59)

    expect(lateEvening >= start && lateEvening < end).toBe(true)
  })

  it.each(["", "   ", "01/03/2026", "2026-3-1"])("MalformedCalendarDate_ReturnsNull", (value) => {
    expect(startOfLocalDayAsUtcIso(value)).toBeNull()
    expect(endOfLocalDayAsUtcIso(value)).toBeNull()
  })
})

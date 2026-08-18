import { describe, expect, it } from "vitest"
import { splitDuration, visibleDurationUnits } from "./duration"

describe("splitDuration", () => {
  it("BreaksASpanIntoDaysHoursMinutesAndSeconds", () => {
    const span = ((3 * 24 + 4) * 60 + 12) * 60 * 1000 + 9000

    expect(splitDuration(span)).toEqual({ days: 3, hours: 4, minutes: 12, seconds: 9 })
  })

  it("KeepsUnitsInsideTheirOwnRangeInsteadOfCarrying", () => {
    expect(splitDuration(23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59_000)).toEqual({
      days: 0,
      hours: 23,
      minutes: 59,
      seconds: 59,
    })
  })

  it("DropsFractionsOfASecondRatherThanRoundingUpToOne", () => {
    expect(splitDuration(1999)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 })
  })

  /** A countdown that has run out reads zero; counting past it would show a negative time remaining. */
  it("ReadsASpentSpanAsZero", () => {
    expect(splitDuration(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })
})

describe("visibleDurationUnits", () => {
  it("ShowsEveryUnitWhileDaysRemain", () => {
    expect(visibleDurationUnits({ days: 3, hours: 0, minutes: 0, seconds: 9 })).toEqual([
      "days",
      "hours",
      "minutes",
      "seconds",
    ])
  })

  it("DropsLeadingUnitsThatHaveRunOut", () => {
    expect(visibleDurationUnits({ days: 0, hours: 4, minutes: 12, seconds: 9 })).toEqual([
      "hours",
      "minutes",
      "seconds",
    ])
  })

  /** An interior zero stays: dropping it would read "4h 9s" and lose which unit the 9 belongs to. */
  it("KeepsAZeroThatSitsBetweenTwoUnitsStillCounting", () => {
    expect(visibleDurationUnits({ days: 0, hours: 4, minutes: 0, seconds: 9 })).toEqual([
      "hours",
      "minutes",
      "seconds",
    ])
  })

  it("FallsBackToSecondsWhenNothingIsLeft", () => {
    expect(visibleDurationUnits({ days: 0, hours: 0, minutes: 0, seconds: 0 })).toEqual(["seconds"])
  })
})

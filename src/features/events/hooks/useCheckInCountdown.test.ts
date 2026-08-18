import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import type { AttendeeRoster } from "@/features/events/schemas/eventCheckIn.schemas"
import { useCheckInCountdown } from "./useCheckInCountdown"

const MINUTE = 60 * 1000

function roster(overrides: Partial<AttendeeRoster> = {}): AttendeeRoster {
  return {
    sessionName: "Opening Night",
    counts: { issued: 0, arrived: 0, expected: 0 },
    attendees: { pageNo: 1, pageSize: 25, totalRecordsCount: 0, pageData: [] },
    outstandingCurrency: null,
    checkInOpensAtUtc: "2026-08-18T17:15:00Z",
    checkInClosesAtUtc: "2026-08-18T22:00:00Z",
    serverTimeUtc: "2026-08-18T17:00:00Z",
    blockEntryUntilPaid: false,
    ...overrides,
  }
}

function renderCountdown(value: AttendeeRoster | undefined, onElapsed = vi.fn()) {
  const view = renderHook(() => useCheckInCountdown(value, onElapsed))
  act(() => {
    vi.advanceTimersByTime(0)
  })

  return { ...view, onElapsed }
}

describe("useCheckInCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-18T17:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("CountsDownToTheInstantTheDoorsOpen", () => {
    const { result } = renderCountdown(roster())

    expect(result.current.phase).toBe("beforeOpen")
    expect(result.current.remainingMs).toBe(15 * MINUTE)
  })

  it("TicksDownAsTimePasses", () => {
    const { result } = renderCountdown(roster())

    act(() => {
      vi.advanceTimersByTime(60 * 1000)
    })

    expect(result.current.remainingMs).toBe(14 * MINUTE)
  })

  /**
   * The scan is judged by the server's clock. A door tablet running fast would otherwise count to zero
   * on a door the server still has shut, and the operator would trust it and admit nobody.
   */
  it("CountsFromTheServersClockRatherThanTheDevices", () => {
    vi.setSystemTime(new Date("2026-08-18T17:10:00Z"))

    const { result } = renderCountdown(roster())

    expect(result.current.remainingMs).toBe(15 * MINUTE)
  })

  it("ReportsTheDoorOpenOnceTheOpeningInstantHasPassed", () => {
    const { result } = renderCountdown(roster({ serverTimeUtc: "2026-08-18T18:00:00Z" }))

    expect(result.current.phase).toBe("open")
    expect(result.current.remainingMs).toBe(4 * 60 * MINUTE)
  })

  it("ReportsTheDoorClosedOnceTheGraceHasRunOut", () => {
    const { result } = renderCountdown(roster({ serverTimeUtc: "2026-08-18T22:30:00Z" }))

    expect(result.current.phase).toBe("closed")
    expect(result.current.remainingMs).toBeNull()
  })

  /** A session nobody dated has no boundary to count to, and must not be treated as shut. */
  it("TreatsAnUndatedSessionAsOpenWithNothingToCountDown", () => {
    const { result } = renderCountdown(roster({ checkInOpensAtUtc: null, checkInClosesAtUtc: null }))

    expect(result.current.phase).toBe("open")
    expect(result.current.remainingMs).toBeNull()
  })

  it("AsksForAFreshRosterWhenTheOpeningInstantArrives", () => {
    const { onElapsed } = renderCountdown(roster())

    expect(onElapsed).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(15 * MINUTE)
    })

    expect(onElapsed).toHaveBeenCalledTimes(1)
  })

  /** Refetching on every tick past the boundary would hammer the API while the response is in flight. */
  it("AsksOnlyOnceWhileTheSameBoundaryStaysElapsed", () => {
    const { onElapsed } = renderCountdown(roster())

    act(() => {
      vi.advanceTimersByTime(20 * MINUTE)
    })

    expect(onElapsed).toHaveBeenCalledTimes(1)
  })

  it("HoldsTheDoorShutUntilTheCountdownActuallyReachesZero", () => {
    const { result, onElapsed } = renderCountdown(roster())

    act(() => {
      vi.advanceTimersByTime(15 * MINUTE - 1000)
    })

    expect(result.current.phase).toBe("beforeOpen")
    expect(onElapsed).not.toHaveBeenCalled()
  })

  /**
   * A roster arriving is not the clock moving. Treating it as one would ask for the roster that has just
   * been fetched, and go on asking for it.
   */
  it("DoesNotAskForARefreshJustBecauseAFreshRosterChangedThePhase", () => {
    const onElapsed = vi.fn()
    const { rerender } = renderHook(({ value }) => useCheckInCountdown(value, onElapsed), {
      initialProps: { value: roster() },
    })

    act(() => {
      vi.advanceTimersByTime(0)
    })
    rerender({ value: roster({ serverTimeUtc: "2026-08-18T18:00:00Z" }) })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(onElapsed).not.toHaveBeenCalled()
  })

  it("CountsNothingBeforeARosterHasArrived", () => {
    const { result, onElapsed } = renderCountdown(undefined)

    expect(result.current.phase).toBe("open")
    expect(result.current.remainingMs).toBeNull()
    expect(onElapsed).not.toHaveBeenCalled()
  })
})

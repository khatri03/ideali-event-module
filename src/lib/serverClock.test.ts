import { afterEach, describe, expect, it, vi } from "vitest"
import { recordServerTime, resetServerClock, serverNow } from "@/lib/serverClock"

afterEach(() => {
  resetServerClock()
  vi.useRealTimers()
})

/** Pins the browser clock so the gap the offset is measured across is the only thing under test. */
function withBrowserClockAt(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe("serverClock", () => {
  /**
   * Every purchase deadline is the server's reading, but the countdown runs in the browser. A device whose clock is
   * minutes fast would retire a cart that is still alive; one running slow would keep counting over seats already
   * back on sale.
   */
  it("ReadsTheGapBetweenTheServerClockAndTheBrowsers", () => {
    withBrowserClockAt("2026-09-09T12:00:00.000Z")

    recordServerTime(new Date("2026-09-09T12:05:00.000Z").toUTCString())

    expect(serverNow()).toBe(new Date("2026-09-09T12:05:00.000Z").getTime())
  })

  /**
   * A response without a usable date says nothing about the server's clock. Reading it as zero would silently throw
   * away an offset already measured and put the countdown back on the device's own clock.
   */
  it("KeepsTheMeasuredOffsetWhenAResponseCarriesNoDate", () => {
    withBrowserClockAt("2026-09-09T12:00:00.000Z")
    recordServerTime(new Date("2026-09-09T12:05:00.000Z").toUTCString())

    recordServerTime(undefined)
    recordServerTime("not a date")

    expect(serverNow()).toBe(new Date("2026-09-09T12:05:00.000Z").getTime())
  })

  /**
   * Before any response has been seen there is nothing to compare against, so the browser's own clock is the only
   * honest reading. Inventing an offset would be worse than having none.
   */
  it("ReadsTheBrowserClockUntilAResponseHasBeenSeen", () => {
    withBrowserClockAt("2026-09-09T12:00:00.000Z")

    expect(serverNow()).toBe(Date.now())
  })
})

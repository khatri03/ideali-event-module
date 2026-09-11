import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { PurchaseTimerChip } from "@/features/events/components/registration/PurchaseTimerChip"
import { recordServerTime, resetServerClock } from "@/lib/serverClock"

afterEach(() => {
  resetServerClock()
  vi.useRealTimers()
})

/** The deadline is always stated in UTC without a zone suffix, exactly as the API sends it. */
const DEADLINE = "2026-09-09T12:10:00"

/** Pins the browser clock, so the only variable is how far the server's reading sits from it. */
function withBrowserClockAt(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

function renderChip(expiresAtUtc: string | null, onExpire = vi.fn()) {
  render(
    <ChakraProvider value={system}>
      <PurchaseTimerChip expiresAtUtc={expiresAtUtc} accentColor="#2563eb" onExpire={onExpire} />
    </ChakraProvider>,
  )
  return { onExpire }
}

describe("PurchaseTimerChip", () => {
  /**
   * The deadline belongs to the server, so the time left has to be measured against the server's clock. A device
   * running five minutes fast would otherwise show five minutes less than the buyer actually has.
   */
  it("CountsAgainstTheServerClockRatherThanTheDevices", () => {
    withBrowserClockAt("2026-09-09T12:05:00.000Z")
    recordServerTime(new Date("2026-09-09T12:00:00.000Z").toUTCString())

    renderChip(DEADLINE)

    expect(screen.getByRole("status")).toHaveTextContent("10:00")
  })

  /**
   * A device running behind must not keep counting over seats the server has already put back on sale. The buyer
   * would sit watching a live-looking timer while every seat they picked was gone.
   */
  it("ReportsTheDeadlineReachedWhenTheServerClockHasPassedIt", () => {
    withBrowserClockAt("2026-09-09T12:00:00.000Z")
    recordServerTime(new Date("2026-09-09T12:11:00.000Z").toUTCString())

    const { onExpire } = renderChip(DEADLINE)

    expect(onExpire).toHaveBeenCalled()
  })

  /**
   * A buyer holding nothing has no deadline to be shown. A countdown over an empty selection would tell them their
   * seats were about to be lost when they had none.
   */
  it("ShowsNothingWhenThereIsNoDeadline", () => {
    withBrowserClockAt("2026-09-09T12:00:00.000Z")

    renderChip(null)

    expect(screen.queryByRole("status")).toBeNull()
  })

  /**
   * Inside the last two minutes the buyer has to be told the hold is about to lapse, not left reading the same calm
   * timer they saw with ten minutes in hand. Without the warning the seats vanish with no notice they were at risk.
   */
  it("WarnsTheHoldIsAboutToLapseInsideTheLastTwoMinutes", () => {
    withBrowserClockAt("2026-09-09T12:00:00.000Z")
    recordServerTime(new Date("2026-09-09T12:08:30.000Z").toUTCString())

    renderChip(DEADLINE)

    const chip = screen.getByRole("status")
    expect(chip).toHaveTextContent("01:30")
    expect(chip).toHaveAccessibleName("Time is running out. Your ticket hold is about to be released.")
  })

  /**
   * Once the window has passed the buyer keeps a chip that reads zero and says the limit was reached, rather than
   * one that disappears. A vanished timer reads as seats still held, and they wait on a hold that is already gone.
   */
  it("ReadsZeroAndNamesTheLimitReachedOnceTheWindowHasPassed", () => {
    withBrowserClockAt("2026-09-09T12:00:00.000Z")
    recordServerTime(new Date("2026-09-09T12:11:00.000Z").toUTCString())

    renderChip(DEADLINE)

    const chip = screen.getByRole("status")
    expect(chip).toHaveTextContent("00:00")
    expect(chip).toHaveAccessibleName("Purchase time limit reached. Remove selected tickets to start a new purchase flow.")
  })
})

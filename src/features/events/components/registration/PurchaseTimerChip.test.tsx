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
})

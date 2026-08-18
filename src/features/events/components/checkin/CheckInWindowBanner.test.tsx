import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { CheckInCountdown } from "@/features/events/hooks/useCheckInCountdown"
import { CheckInWindowBanner } from "./CheckInWindowBanner"

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function renderBanner(countdown: Partial<CheckInCountdown> = {}) {
  const { container } = render(
    <ChakraProvider value={system}>
      <CheckInWindowBanner
        countdown={{
          phase: "beforeOpen",
          remainingMs: 3 * DAY + 4 * HOUR + 12 * MINUTE + 9000,
          opensAt: new Date("2026-08-18T17:15:00Z"),
          closesAt: new Date("2026-08-18T22:00:00Z"),
          ...countdown,
        }}
      />
    </ChakraProvider>,
  )

  return container
}

describe("CheckInWindowBanner", () => {
  it("SaysTheDoorIsNotOpenYetAndHowLongIsLeft", () => {
    renderBanner()

    expect(screen.getByText("Check-in not open yet")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("04")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText("09")).toBeInTheDocument()
  })

  it("LabelsEachUnitOfTheCountdownSeparately", () => {
    renderBanner()

    expect(screen.getByText("D")).toBeInTheDocument()
    expect(screen.getByText("H")).toBeInTheDocument()
    expect(screen.getByText("M")).toBeInTheDocument()
    expect(screen.getByText("S")).toBeInTheDocument()
  })

  /** A "0D" card sitting there for the last day of the count is noise the operator has to look past. */
  it("LeavesOutUnitsThatHaveAlreadyRunOut", () => {
    renderBanner({ remainingMs: 12 * MINUTE + 9000 })

    expect(screen.queryByText("D")).not.toBeInTheDocument()
    expect(screen.queryByText("H")).not.toBeInTheDocument()
    expect(screen.getByText("M")).toBeInTheDocument()
    expect(screen.getByText("S")).toBeInTheDocument()
  })

  it("CountsTheFinalSecondsOnTheirOwn", () => {
    renderBanner({ remainingMs: 9000 })

    expect(screen.getByText("S")).toBeInTheDocument()
    expect(screen.queryByText("M")).not.toBeInTheDocument()
  })

  it("NamesTheClockTimeTheDoorsOpenAtSoStaffCanPlanRoundIt", () => {
    renderBanner()

    expect(screen.getByText(/Doors open at/)).toBeInTheDocument()
  })

  /**
   * A timer ticking at staff for the whole event is ignored by the time it matters, so nothing is shown
   * until the closing boundary is near enough to act on.
   */
  it("StaysSilentWhileTheDoorIsOpenAndClosingIsFarOff", () => {
    const container = renderBanner({ phase: "open", remainingMs: 4 * HOUR })

    expect(container).toBeEmptyDOMElement()
  })

  it("WarnsWhenTheDoorIsAboutToClose", () => {
    renderBanner({ phase: "open", remainingMs: 20 * MINUTE })

    expect(screen.getByText("Check-in closes soon")).toBeInTheDocument()
    expect(screen.getByText(/Closes at/)).toBeInTheDocument()
  })

  it("SaysTheDoorHasClosedRatherThanCountingPastIt", () => {
    renderBanner({ phase: "closed", remainingMs: null })

    expect(screen.getByText("Check-in has closed")).toBeInTheDocument()
    expect(screen.queryByText("S")).not.toBeInTheDocument()
  })

  it("StaysSilentForASessionWithNoWindowToCountTowards", () => {
    const container = renderBanner({ phase: "open", remainingMs: null, opensAt: null, closesAt: null })

    expect(container).toBeEmptyDOMElement()
  })

  /**
   * The cards repaint every second; announcing them at that rate would talk over the operator. The
   * spoken wording is coarser so the live region only speaks when something has actually changed.
   */
  it("SpeaksTheTimeLeftWithoutReadingOutEverySecond", () => {
    renderBanner({ remainingMs: 3 * DAY + HOUR + 9000 })

    expect(screen.getByText("Check-in opens in 3 days 1 hour")).toBeInTheDocument()
  })

  it("SpeaksTheLastMinuteWithoutNamingAZeroForEveryUnit", () => {
    renderBanner({ remainingMs: 9000 })

    expect(screen.getByText("Check-in opens in less than a minute")).toBeInTheDocument()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { TicketHoldNotice } from "./TicketHoldNotice"

function renderNotice(secondsAway: number, onRelease = vi.fn()) {
  render(
    <ChakraProvider value={system}>
      <TicketHoldNotice releasesAtMs={Date.now() + secondsAway * 1000} onRelease={onRelease} />
    </ChakraProvider>,
  )

  return onRelease
}

describe("TicketHoldNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("TellsTheBuyerTheSeatsAreHeldRatherThanGone", () => {
    renderNotice(245)

    expect(screen.getByText("Currently in someone else's checkout")).toBeInTheDocument()
  })

  it("ShowsTheWaitInMinutesAndSeconds", () => {
    renderNotice(245)

    expect(screen.getByText(/about 4:05/)).toBeInTheDocument()
  })

  it("CountsDownWithoutAnyBuyerAction", () => {
    renderNotice(65)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByText(/about 0:55/)).toBeInTheDocument()
  })

  it("AsksForAvailabilityOnceTheHoldRunsOut", () => {
    const onRelease = renderNotice(3)

    act(() => {
      vi.advanceTimersByTime(4_000)
    })

    expect(onRelease).toHaveBeenCalled()
    expect(screen.getByText("Checking for released seats...")).toBeInTheDocument()
  })

  it("AnnouncesItselfToAssistiveTechnologyAsAStatus", () => {
    renderNotice(120)

    expect(screen.getByRole("status")).toBeInTheDocument()
  })
})

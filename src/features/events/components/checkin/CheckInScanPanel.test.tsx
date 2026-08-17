import { afterEach, describe, expect, it, vi } from "vitest"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { CheckInAttempt } from "@/api/eventCheckIn"
import { CheckInScanPanel } from "./CheckInScanPanel"

// The camera is a browser capability happy-dom does not have; what this panel owes the operator is
// the paused/blocked state around it, which is asserted through the stub.
vi.mock("./TicketScanner", () => ({
  TicketScanner: ({ isPaused }: { isPaused: boolean }) => (
    <div data-testid="scanner">{isPaused ? "paused" : "scanning"}</div>
  ),
}))

const ADMITTED: CheckInAttempt = {
  outcome: "Success",
  ticketCode: "TKT-1",
  attendeeName: "Admitted Guest",
  message: "Ticket checked in successfully.",
  checkedInAtUtc: "2026-08-17T18:00:00Z",
  outstandingAmount: null,
  outstandingCurrency: null,
}

const ALREADY_INSIDE: CheckInAttempt = {
  outcome: "AlreadyCheckedIn",
  ticketCode: "TKT-2",
  attendeeName: "Returning Guest",
  message: "This ticket was already checked in.",
  checkedInAtUtc: "2026-08-17T18:00:00Z",
  outstandingAmount: null,
  outstandingCurrency: null,
}

const REFUSED: CheckInAttempt = {
  outcome: "Invalid",
  ticketCode: "TKT-3",
  attendeeName: null,
  message: "This ticket is not valid for this session.",
  checkedInAtUtc: null,
  outstandingAmount: null,
  outstandingCurrency: null,
}

function renderPanel({
  attempt = null as CheckInAttempt | null,
  isOnline = true,
  isAdmitting = false,
} = {}) {
  const onScan = vi.fn()
  const onUndo = vi.fn()

  render(
    <ChakraProvider value={system}>
      <CheckInScanPanel
        attempt={attempt}
        isOnline={isOnline}
        isAdmitting={isAdmitting}
        isReversing={false}
        onScan={onScan}
        onUndo={onUndo}
      />
    </ChakraProvider>,
  )

  return { onScan, onUndo }
}

describe("CheckInScanPanel", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("ScansWhileNothingIsWaitingToBeRead", () => {
    renderPanel()

    expect(screen.getByTestId("scanner")).toHaveTextContent("scanning")
  })

  it("HoldsTheScannerJustLongEnoughToShowAnAdmission", () => {
    vi.useFakeTimers()
    renderPanel({ attempt: ADMITTED })

    expect(screen.getByTestId("scanner")).toHaveTextContent("paused")
  })

  /** A queue of admitted guests must not need a button press between each one. */
  it("ResumesScanningOnItsOwnAfterAnAdmission", () => {
    vi.useFakeTimers()
    renderPanel({ attempt: ADMITTED })

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(screen.getByTestId("scanner")).toHaveTextContent("scanning")
  })

  /** Being told a guest is already inside is information, not a decision — the queue must not stall on it. */
  it("ResumesScanningOnItsOwnAfterAnAlreadyCheckedInTicket", () => {
    vi.useFakeTimers()
    renderPanel({ attempt: ALREADY_INSIDE })

    expect(screen.getByTestId("scanner")).toHaveTextContent("paused")

    act(() => {
      vi.advanceTimersByTime(2500)
    })

    expect(screen.getByTestId("scanner")).toHaveTextContent("scanning")
  })

  /**
   * A refusal holds longest, because the operator has to turn someone away while it is on screen, but
   * nothing on this panel can clear it - so it has to clear itself or the door stops working.
   */
  it("HoldsARefusedTicketLongerThenResumesWithoutBeingCleared", () => {
    vi.useFakeTimers()
    renderPanel({ attempt: REFUSED })

    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(screen.getByTestId("scanner")).toHaveTextContent("paused")

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByTestId("scanner")).toHaveTextContent("scanning")
  })

  it("StopsScanningWhileAScanIsStillBeingRecorded", () => {
    renderPanel({ isAdmitting: true })

    expect(screen.getByTestId("scanner")).toHaveTextContent("paused")
  })

  /** A scan that cannot be recorded must not look like an admission. */
  it("StopsScanningAndSaysSoWhenTheNetworkIsGone", () => {
    renderPanel({ isOnline: false })

    expect(screen.getByRole("alert")).toHaveTextContent("No connection")
    expect(screen.getByTestId("scanner")).toHaveTextContent("paused")
    expect(screen.getByRole("button", { name: "Check in" })).toBeDisabled()
  })

  /** The strip is the record of the last ticket read; the server's wording stays on the toast alone. */
  it("KeepsTheLastOutcomeOnScreenWithoutRepeatingTheToastMessage", () => {
    renderPanel({ attempt: REFUSED })

    expect(screen.getByRole("status")).toHaveTextContent("TKT-3")
    expect(screen.queryByText(REFUSED.message)).not.toBeInTheDocument()
  })

  /** Reversing undoes a record of who was admitted, so it is never one stray tap away. */
  it("AsksBeforeReversingTheAdmissionItJustReported", async () => {
    const { onUndo } = renderPanel({ attempt: ADMITTED })

    await userEvent.click(screen.getByRole("button", { name: "Undo" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(onUndo).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: /^undo check-in$/i }))

    expect(onUndo).toHaveBeenCalledWith("TKT-1")
  })

  /**
   * Confirming used to drop the dialog out of the tree mid-close, so the pointer-events guard it puts on
   * the body was never lifted and the page stopped taking clicks. Being able to reach the dialog a second
   * time is the proof the screen is still live after an action is confirmed.
   */
  it("StaysUsableAfterAReversalIsConfirmed", async () => {
    renderPanel({ attempt: ADMITTED })

    await userEvent.click(screen.getByRole("button", { name: "Undo" }))
    const dialog = await screen.findByRole("alertdialog")
    await userEvent.click(within(dialog).getByRole("button", { name: /^undo check-in$/i }))

    await userEvent.click(screen.getByRole("button", { name: "Undo" }))

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument()
  })
})

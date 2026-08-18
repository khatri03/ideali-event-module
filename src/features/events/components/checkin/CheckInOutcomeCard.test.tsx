import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { CheckInAttempt } from "@/api/eventCheckIn"
import { CheckInOutcomeCard } from "./CheckInOutcomeCard"

function renderCard(attempt: CheckInAttempt, isReversing = false) {
  const onUndo = vi.fn()

  render(
    <ChakraProvider value={system}>
      <CheckInOutcomeCard attempt={attempt} isReversing={isReversing} onUndo={onUndo} />
    </ChakraProvider>,
  )

  return onUndo
}

const ADMITTED: CheckInAttempt = {
  outcome: "Success",
  ticketCode: "TKT-1",
  attendeeName: "Wilhelmina Featherstonehaugh",
  message: "Ticket checked in successfully.",
  checkedInAtUtc: "2026-08-17T18:00:00Z",
  outstandingAmount: null,
  outstandingCurrency: null,
}

const REFUSED: CheckInAttempt = {
  outcome: "Invalid",
  ticketCode: "TKT-9",
  attendeeName: null,
  message: "Ticket code is invalid.",
  checkedInAtUtc: null,
  outstandingAmount: null,
  outstandingCurrency: null,
}

const UNPAID: CheckInAttempt = {
  outcome: "PaymentRequired",
  ticketCode: "TKT-4",
  attendeeName: "Ayesha Khan",
  message: "Payment of $40.00 is required before entry.",
  checkedInAtUtc: "2026-08-17T18:00:00Z",
  outstandingAmount: "40.00",
  outstandingCurrency: "USD",
}

describe("CheckInOutcomeCard", () => {
  it("ReportsAnAcceptedTicketAsCheckedIn", () => {
    renderCard(ADMITTED)

    expect(screen.getByText("Check-in successful")).toBeInTheDocument()
    expect(screen.getByText("TKT-1")).toBeInTheDocument()
  })

  /** The operator has a person in front of them, and a code alone does not tell them who. */
  it("NamesTheGuestTheTicketAdmits", () => {
    renderCard(ADMITTED)

    expect(screen.getByText("Wilhelmina Featherstonehaugh")).toBeInTheDocument()
  })

  it("ShowsOnlyTheCodeWhenTheServerNamedNobody", () => {
    renderCard({ ...ADMITTED, attendeeName: null })

    expect(screen.getByText("TKT-1")).toBeInTheDocument()
    expect(screen.getByText("Check-in successful")).toBeInTheDocument()
  })

  it("SeparatesATicketAlreadyInsideFromOneThatWasJustAdmitted", () => {
    renderCard({ ...ADMITTED, outcome: "AlreadyCheckedIn" })

    expect(screen.getByText("Already inside")).toBeInTheDocument()
  })

  it("RefusesEntryLoudlyForAnInvalidTicket", () => {
    renderCard(REFUSED)

    expect(screen.getByText("Do not admit")).toBeInTheDocument()
  })

  /** The toast carries the server's wording; repeating it here is what made this strip noise. */
  it("LeavesTheServerMessageToTheToast", () => {
    renderCard(ADMITTED)

    expect(screen.queryByText("Ticket checked in successfully.")).not.toBeInTheDocument()
  })

  it("OffersNoReversalForATicketThatWasNeverAdmitted", () => {
    renderCard(REFUSED)

    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument()
  })

  it("ReversesTheAdmissionItJustReported", async () => {
    const onUndo = renderCard(ADMITTED)

    await userEvent.click(screen.getByRole("button", { name: "Undo" }))

    expect(onUndo).toHaveBeenCalledWith("TKT-1")
  })

  /**
   * The organizer can send a ticket against an order that was never paid, and the operator on the door
   * is the only person positioned to collect what is left.
   */
  it("TellsTheDeskWhatTheAdmittedGuestStillOwes", () => {
    renderCard({ ...ADMITTED, outstandingAmount: "40.00", outstandingCurrency: "USD" })

    expect(screen.getByText("Balance due $40.00 — collect at desk")).toBeInTheDocument()
  })

  /** Naming the money must not become a second gate: the guest is already through by the time it reads. */
  it("StillReportsTheAdmissionAlongsideTheBalance", () => {
    renderCard({ ...ADMITTED, outstandingAmount: "40.00", outstandingCurrency: "USD" })

    expect(screen.getByText("Check-in successful")).toBeInTheDocument()
  })

  it("RepeatsTheBalanceForAGuestScannedASecondTime", () => {
    renderCard({
      ...ADMITTED,
      outcome: "AlreadyCheckedIn",
      outstandingAmount: "12.50",
      outstandingCurrency: "CAD",
    })

    expect(screen.getByText("Balance due CA$12.50 — collect at desk")).toBeInTheDocument()
  })

  /** An event without a payment account still owes the desk a figure, just not a symbol for it. */
  it("ShowsTheAmountEvenWhenNoCurrencyWasResolved", () => {
    renderCard({ ...ADMITTED, outstandingAmount: "40.00", outstandingCurrency: null })

    expect(screen.getByText("Balance due 40.00 — collect at desk")).toBeInTheDocument()
  })

  it("SaysNothingAboutMoneyWhenTheOrderIsSettled", () => {
    renderCard(ADMITTED)

    expect(screen.queryByText(/Balance due/)).not.toBeInTheDocument()
  })

  it("BlocksASecondReversalWhileTheFirstIsInFlight", () => {
    renderCard(ADMITTED, true)

    expect(screen.getByRole("button", { name: /Reversing/ })).toBeDisabled()
  })
  /**
   * The event refuses an unpaid order, so this is a turn-away rather than an admission. Offering Undo
   * would suggest a check-in happened, and the operator needs the figure to send them to the cashier.
   */
  it("ReportsAnUnpaidOrderAsARefusalCarryingWhatIsOwed", () => {
    renderCard(UNPAID)

    expect(screen.getByText("Payment required")).toBeInTheDocument()
    expect(screen.getByText(/40\.00/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument()
  })
})

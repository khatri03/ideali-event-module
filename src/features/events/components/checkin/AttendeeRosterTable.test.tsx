import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { Attendee } from "@/features/events/schemas/eventCheckIn.schemas"
import { AttendeeRosterTable } from "./AttendeeRosterTable"

function attendee(overrides: Partial<Attendee> = {}): Attendee {
  return {
    ticketUniqueId: "ticket-1",
    ticketCode: "TKT-1",
    attendeeName: "Ayesha Khan",
    attendeeEmail: "ayesha@example.com",
    ticketTypeName: "General Admission",
    invoiceUniqueId: "invoice-1",
    invoiceNo: "INV-2026-0001",
    ticketStatus: "Active",
    checkedInAtUtc: null,
    checkedInBy: null,
    outstandingAmount: null,
    ...overrides,
  }
}

function renderTable(
  attendees: Attendee[],
  {
    busyTicketCode = null as string | null,
    sendingTicketUniqueId = null as string | null,
    outstandingCurrency = "USD" as string | null,
    isDoorOpen = true,
    blockEntryUntilPaid = false,
  } = {},
) {
  const onCheckIn = vi.fn()
  const onUndo = vi.fn()
  const onSendTicket = vi.fn()

  render(
    <ChakraProvider value={system}>
      <AttendeeRosterTable
        attendees={attendees}
        outstandingCurrency={outstandingCurrency}
        isDoorOpen={isDoorOpen}
        blockEntryUntilPaid={blockEntryUntilPaid}
        busyTicketCode={busyTicketCode}
        sendingTicketUniqueId={sendingTicketUniqueId}
        onCheckIn={onCheckIn}
        onUndo={onUndo}
        onSendTicket={onSendTicket}
      />
    </ChakraProvider>,
  )

  return { onCheckIn, onUndo, onSendTicket }
}

describe("AttendeeRosterTable", () => {
  it("OffersCheckInForSomeoneWhoHasNotArrived", async () => {
    const { onCheckIn } = renderTable([attendee()])

    await userEvent.click(screen.getByRole("button", { name: "Check in TKT-1" }))

    expect(onCheckIn).toHaveBeenCalledWith("TKT-1")
  })

  it("OffersUndoForSomeoneAlreadyInside", async () => {
    const { onUndo, onCheckIn } = renderTable([
      attendee({ ticketStatus: "CheckedIn", checkedInAtUtc: "2026-08-17T18:00:00Z" }),
    ])

    expect(screen.getByText("Arrived")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Undo check-in for TKT-1" }))

    expect(onUndo).toHaveBeenCalledWith("TKT-1")
    expect(onCheckIn).not.toHaveBeenCalled()
  })

  it("MarksSomeoneWithNoNameRatherThanLeavingTheRowBlank", () => {
    renderTable([attendee({ attendeeName: null, attendeeEmail: null })])

    expect(screen.getByText("Unnamed attendee")).toBeInTheDocument()
  })

  it("BlocksTheRowActionWhileThatTicketIsInFlight", () => {
    renderTable([attendee()], { busyTicketCode: "TKT-1" })

    expect(screen.getByRole("button", { name: "Check in TKT-1" })).toBeDisabled()
  })

  /** The invoice number is what a guest with an unreadable ticket usually has to hand. */
  it("ShowsTheInvoiceNumberEachTicketWasBoughtOn", () => {
    renderTable([attendee()])

    expect(screen.getByText("INV-2026-0001")).toBeInTheDocument()
  })

  /**
   * A guest reading out an invoice number is admitted from this row without a scan, so the row is the
   * only place the operator can learn money is owed while there is still time to ask for it.
   */
  it("FlagsARowWhoseOrderStillOwesMoney", () => {
    renderTable([attendee({ outstandingAmount: "40.00" })])

    expect(screen.getByText("Due $40.00")).toBeInTheDocument()
  })

  it("NamesTheBalanceInTheEventsOwnCurrency", () => {
    renderTable([attendee({ outstandingAmount: "12.50" })], { outstandingCurrency: "CAD" })

    expect(screen.getByText("Due CA$12.50")).toBeInTheDocument()
  })

  it("LeavesASettledRowUnflagged", () => {
    renderTable([attendee()])

    expect(screen.queryByText(/^Due /)).not.toBeInTheDocument()
  })

  it("SendsOneTicketAgainWithTheOrderItBelongsTo", async () => {
    const { onSendTicket } = renderTable([attendee()])

    await userEvent.click(screen.getByRole("button", { name: "Send ticket TKT-1 again" }))

    expect(onSendTicket).toHaveBeenCalledWith({ invoiceUniqueId: "invoice-1", ticketUniqueId: "ticket-1" })
  })

  it("BlocksASecondSendWhileTheFirstIsStillGoing", () => {
    renderTable([attendee()], { sendingTicketUniqueId: "ticket-1" })

    expect(screen.getByRole("button", { name: "Send ticket TKT-1 again" })).toBeDisabled()
  })

  /** Offering a send with no order behind it would only produce a refusal from the server. */
  it("WithholdsSendWhenTheTicketCarriesNoOrder", () => {
    renderTable([attendee({ invoiceUniqueId: "", invoiceNo: "" })])

    expect(screen.queryByRole("button", { name: "Send ticket TKT-1 again" })).not.toBeInTheDocument()
  })

  /**
   * Admitting from a row is the same act as scanning, judged by the same clock, so offering it before
   * the window opens only produces a refusal with a guest already at the desk.
   */
  it("WithholdsCheckInFromARowWhileTheDoorIsShut", () => {
    renderTable([attendee()], { isDoorOpen: false })

    expect(screen.queryByRole("button", { name: "Check in TKT-1" })).not.toBeInTheDocument()
  })

  /** A mistaken admission has to stay correctable after the doors have shut. */
  it("StillOffersUndoOnceTheDoorHasShut", async () => {
    const { onUndo } = renderTable(
      [attendee({ ticketStatus: "CheckedIn", checkedInAtUtc: "2026-08-17T18:00:00Z" })],
      { isDoorOpen: false },
    )

    await userEvent.click(screen.getByRole("button", { name: "Undo check-in for TKT-1" }))

    expect(onUndo).toHaveBeenCalledWith("TKT-1")
  })

  /**
   * The event refuses an unpaid order at the door, so offering the admission here only produces a
   * refusal with a guest already at the desk. The balance stays on the row so the operator can name it.
   */
  it("WithholdsCheckInFromAnUnpaidRowWhenTheEventRefusesUnpaidEntry", () => {
    renderTable([attendee({ outstandingAmount: "40.00" })], { blockEntryUntilPaid: true })

    expect(screen.queryByRole("button", { name: "Check in TKT-1" })).not.toBeInTheDocument()
    expect(screen.getByText("Due $40.00")).toBeInTheDocument()
  })

  it("StillOffersCheckInOnASettledRowWhenTheEventRefusesUnpaidEntry", async () => {
    const { onCheckIn } = renderTable([attendee()], { blockEntryUntilPaid: true })

    await userEvent.click(screen.getByRole("button", { name: "Check in TKT-1" }))

    expect(onCheckIn).toHaveBeenCalledWith("TKT-1")
  })

  /** Flagging the balance must not become a gate on an event that never asked for one. */
  it("StillOffersCheckInOnAnUnpaidRowWhenTheEventAdmitsUnpaidGuests", async () => {
    const { onCheckIn } = renderTable([attendee({ outstandingAmount: "40.00" })])

    await userEvent.click(screen.getByRole("button", { name: "Check in TKT-1" }))

    expect(onCheckIn).toHaveBeenCalledWith("TKT-1")
  })

  /** A mistaken admission stays correctable whatever the order owes. */
  it("StillOffersUndoOnAnUnpaidRowWhenTheEventRefusesUnpaidEntry", () => {
    renderTable(
      [attendee({ ticketStatus: "CheckedIn", checkedInAtUtc: "2026-08-17T18:00:00Z", outstandingAmount: "40.00" })],
      { blockEntryUntilPaid: true },
    )

    expect(screen.getByRole("button", { name: "Undo check-in for TKT-1" })).toBeInTheDocument()
  })

  it("SaysTheSearchMatchedNobodyInsteadOfShowingAnEmptyTable", () => {
    renderTable([])

    expect(screen.getByText("No attendee matches this search")).toBeInTheDocument()
  })
})

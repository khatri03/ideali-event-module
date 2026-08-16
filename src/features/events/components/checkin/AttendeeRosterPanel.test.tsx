import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { Attendee, AttendeeRoster } from "@/features/events/schemas/eventCheckIn.schemas"
import { AttendeeRosterPanel } from "./AttendeeRosterPanel"

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
    ...overrides,
  }
}

function roster(attendees: Attendee[]): AttendeeRoster {
  return {
    sessionName: "Opening Night",
    counts: { issued: attendees.length, arrived: 0, expected: attendees.length },
    attendees: { pageNo: 1, pageSize: 25, totalRecordsCount: attendees.length, pageData: attendees },
  }
}

function renderPanel(attendees: Attendee[] = [attendee()]) {
  const handlers = {
    onSearchChange: vi.fn(),
    onScopeChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onCheckIn: vi.fn(),
    onUndo: vi.fn(),
    onSendTicket: vi.fn(),
  }

  render(
    <ChakraProvider value={system}>
      <AttendeeRosterPanel
        roster={roster(attendees)}
        isLoading={false}
        isError={false}
        search=""
        scope="All"
        page={1}
        pageSize={25}
        busyTicketCode={null}
        sendingTicketUniqueId={null}
        {...handlers}
      />
    </ChakraProvider>,
  )

  return handlers
}

async function openConfirmation(buttonName: string) {
  await userEvent.click(screen.getByRole("button", { name: buttonName }))

  return screen.findByRole("alertdialog")
}

describe("AttendeeRosterPanel", () => {
  /** The rows sit a few pixels apart, so admitting from the list is confirmed before it is recorded. */
  it("AsksBeforeCheckingSomeoneInFromTheRoster", async () => {
    const { onCheckIn } = renderPanel()

    const dialog = await openConfirmation("Check in TKT-1")
    expect(onCheckIn).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: /^check in$/i }))

    expect(onCheckIn).toHaveBeenCalledWith("TKT-1")
  })

  it("AsksBeforeReversingACheckIn", async () => {
    const { onUndo } = renderPanel([
      attendee({ ticketStatus: "CheckedIn", checkedInAtUtc: "2026-08-17T18:00:00Z" }),
    ])

    const dialog = await openConfirmation("Undo check-in for TKT-1")
    expect(onUndo).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: /^undo check-in$/i }))

    expect(onUndo).toHaveBeenCalledWith("TKT-1")
  })

  it("AsksBeforeSendingATicketAgain", async () => {
    const { onSendTicket } = renderPanel()

    const dialog = await openConfirmation("Send ticket TKT-1 again")
    expect(onSendTicket).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: /^send ticket$/i }))

    expect(onSendTicket).toHaveBeenCalledWith({ invoiceUniqueId: "invoice-1", ticketUniqueId: "ticket-1" })
  })

  it("RecordsNothingWhenTheConfirmationIsCancelled", async () => {
    const { onCheckIn } = renderPanel()

    const dialog = await openConfirmation("Check in TKT-1")
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(onCheckIn).not.toHaveBeenCalled()
  })

  it("NamesTheTicketTheConfirmationIsAbout", async () => {
    const { onCheckIn } = renderPanel([attendee({ ticketCode: "TKT-42" })])

    const dialog = await openConfirmation("Check in TKT-42")

    expect(within(dialog).getByText(/TKT-42/)).toBeInTheDocument()
    expect(onCheckIn).not.toHaveBeenCalled()
  })
})

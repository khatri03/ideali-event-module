import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import type { EventInvoiceLineItem } from "@/api/eventInvoices"
import { AttendeeDetailModal } from "./AttendeeDetailModal"

const { resendEventInvoiceTicketMock, updateEventInvoiceAttendeeMock } = vi.hoisted(() => ({
  resendEventInvoiceTicketMock: vi.fn(),
  updateEventInvoiceAttendeeMock: vi.fn(),
}))

vi.mock("@/api/eventInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/eventInvoices")>()
  return {
    ...actual,
    resendEventInvoiceTicket: resendEventInvoiceTicketMock,
    updateEventInvoiceAttendee: updateEventInvoiceAttendeeMock,
  }
})

const INVOICE_UNIQUE_ID = "invoice-1"

const LINE_ITEM: EventInvoiceLineItem = {
  invoiceItemUniqueId: "line-1",
  sessionUniqueId: "session-1",
  sessionName: "Friday Dinner",
  ticketTypeName: "Standard Seat",
  quantity: 1,
  unitPrice: "150",
  lineTotal: "150",
  attendees: [
    {
      slotIndex: 0,
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-0123",
    },
  ],
  tickets: [
    {
      ticketUniqueId: "ticket-1",
      ticketCode: "EVT_ABC123",
      seatObjectLabel: "A-14",
      ticketStatus: "Active",
      ticketStatusLabel: "Active",
      deliveredAtUtc: "2026-08-01T18:00:00Z",
      checkedInAtUtc: null,
    },
  ],
}

function renderModal(lineItem: EventInvoiceLineItem = LINE_ITEM, canResendTickets = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <AttendeeDetailModal
          invoiceUniqueId={INVOICE_UNIQUE_ID}
          lineItem={lineItem}
          canResendTickets={canResendTickets}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("AttendeeDetailModal attendee display", () => {
  it("RendersAttendeeName_Email_Phone_SoOrganizerCanSeeWhoHoldsEachTicket", () => {
    renderModal()

    expect(screen.getByText("Jane Doe")).toBeInTheDocument()
    expect(screen.getByText("jane@example.com · 555-0123")).toBeInTheDocument()
  })

  it("RendersTicketCode_WithSeatLabel_ForEachAttendeeRow", () => {
    renderModal()

    expect(screen.getByText("EVT_ABC123")).toBeInTheDocument()
    expect(screen.getByText("A-14")).toBeInTheDocument()
  })

  it("ShowsLineItemName_AsModalTitle_SoOrganizerKnowsWhichLineTheyAreViewing", () => {
    renderModal()

    expect(screen.getByText("Standard Seat")).toBeInTheDocument()
    expect(screen.getByText(/Friday Dinner/)).toBeInTheDocument()
  })

  it("ShowsEmptyState_WhenNoAttendeesOnLineItem", () => {
    renderModal({ ...LINE_ITEM, attendees: [], tickets: [] })

    expect(screen.getByText(/no attendee details recorded/i)).toBeInTheDocument()
  })

  it("ShowsNoContactInfo_WhenAttendeeHasNeitherEmailNorPhone", () => {
    renderModal({
      ...LINE_ITEM,
      attendees: [{ slotIndex: 0, name: "Jane Doe", email: null, phone: null }],
    })

    expect(screen.getByText("No contact info")).toBeInTheDocument()
  })

  it("HidesSeatAndTicketLink_WhenSlotHasNoIssuedTicket", () => {
    renderModal({ ...LINE_ITEM, tickets: [] })

    expect(screen.queryByRole("link", { name: /view ticket/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /copy ticket code/i })).not.toBeInTheDocument()
    expect(screen.queryByText("A-14")).not.toBeInTheDocument()
  })

  it("CopyCodeButton_WritesTicketCodeToClipboard_SoOrganizerCanPasteItIntoSupportTools", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole("button", { name: "Copy ticket code EVT_ABC123" }))

    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe("EVT_ABC123"))
  })
})

describe("AttendeeDetailModal resend", () => {
  beforeEach(() => {
    resendEventInvoiceTicketMock.mockReset().mockResolvedValue(undefined)
    updateEventInvoiceAttendeeMock.mockReset().mockResolvedValue(undefined)
  })

  it("ResendButton_Present_WhenCanResendTicketsTrue", () => {
    renderModal()

    expect(screen.getByRole("button", { name: "Resend ticket EVT_ABC123" })).toBeInTheDocument()
  })

  it("ResendButton_Absent_WhenCanResendTicketsFalse", () => {
    renderModal(LINE_ITEM, false)

    expect(screen.queryByRole("button", { name: /resend ticket/i })).not.toBeInTheDocument()
  })

  it("ResendButton_RequiresConfirmation_BeforeCallingApi", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole("button", { name: "Resend ticket EVT_ABC123" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("EVT_ABC123")).toBeInTheDocument()
    expect(resendEventInvoiceTicketMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: /resend ticket/i }))

    await waitFor(() => expect(resendEventInvoiceTicketMock).toHaveBeenCalledWith(INVOICE_UNIQUE_ID, "ticket-1"))
  })
})

describe("AttendeeDetailModal edit attendee", () => {
  beforeEach(() => {
    resendEventInvoiceTicketMock.mockReset().mockResolvedValue(undefined)
    updateEventInvoiceAttendeeMock.mockReset().mockResolvedValue(undefined)
  })

  it("EditButton_ShowsForm_WithCurrentAttendeeValues", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole("button", { name: "Edit attendee" }))

    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument()
    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument()
    expect(screen.getByDisplayValue("555-0123")).toBeInTheDocument()
  })

  it("SaveButton_CallsUpdateApi_WithCorrectedValues", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole("button", { name: "Edit attendee" }))

    const nameInput = screen.getByDisplayValue("Jane Doe")
    await user.clear(nameInput)
    await user.type(nameInput, "John Smith")

    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(updateEventInvoiceAttendeeMock).toHaveBeenCalledWith(
        INVOICE_UNIQUE_ID,
        "line-1",
        0,
        expect.objectContaining({ name: "John Smith" }),
      ),
    )
  })

  it("EditMode_HidesResendButton_SoNoConflictingActionRunsWhileEditing", async () => {
    const user = userEvent.setup()
    renderModal()

    expect(screen.getByRole("button", { name: "Resend ticket EVT_ABC123" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Edit attendee" }))

    expect(screen.queryByRole("button", { name: "Resend ticket EVT_ABC123" })).not.toBeInTheDocument()
  })

  it("CancelButton_DismissesEditForm_WithoutCallingApi", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole("button", { name: "Edit attendee" }))
    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(updateEventInvoiceAttendeeMock).not.toHaveBeenCalled()
    expect(screen.getByText("Jane Doe")).toBeInTheDocument()
  })

  it("SaveButton_ShowsError_WhenNameIsBlank", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole("button", { name: "Edit attendee" }))

    const nameInput = screen.getByDisplayValue("Jane Doe")
    await user.clear(nameInput)
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(updateEventInvoiceAttendeeMock).not.toHaveBeenCalled()
  })
})

import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { APP_ROUTES } from "@/utils/routes"
import type { EventInvoiceLineItem } from "@/api/eventInvoices"
import { EventInvoiceLineItemsSection } from "./EventInvoiceLineItemsSection"

const { resendEventInvoiceMock, resendEventInvoiceTicketMock } = vi.hoisted(() => ({
  resendEventInvoiceMock: vi.fn(),
  resendEventInvoiceTicketMock: vi.fn(),
}))

vi.mock("@/api/eventInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/eventInvoices")>()
  return {
    ...actual,
    resendEventInvoice: resendEventInvoiceMock,
    resendEventInvoiceTicket: resendEventInvoiceTicketMock,
  }
})

const INVOICE_UNIQUE_ID = "invoice-1"

const LINE_ITEMS: EventInvoiceLineItem[] = [
  {
    invoiceItemUniqueId: "line-1",
    sessionUniqueId: "session-1",
    sessionName: "Friday Dinner",
    ticketTypeName: "General Admission",
    quantity: 1,
    unitPrice: "100",
    lineTotal: "100",
    attendees: [{ name: "Jane Doe", email: "jane@example.com", phone: null }],
    tickets: [
      {
        ticketUniqueId: "ticket-1",
        ticketCode: "EVT_ABC123",
        ticketStatus: "CheckedIn",
        ticketStatusLabel: "Checked In",
        deliveredAtUtc: "2026-08-01T18:00:00Z",
        checkedInAtUtc: null,
      },
    ],
  },
]

function renderSection(lineItems: EventInvoiceLineItem[] = LINE_ITEMS, canResendTickets = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <EventInvoiceLineItemsSection
          invoiceUniqueId={INVOICE_UNIQUE_ID}
          lineItems={lineItems}
          canResendTickets={canResendTickets}
        />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("EventInvoiceLineItemsSection resend actions", () => {
  beforeEach(() => {
    resendEventInvoiceMock.mockReset().mockResolvedValue(undefined)
    resendEventInvoiceTicketMock.mockReset().mockResolvedValue(undefined)
  })

  it("TicketStatus_RendersTheApiLabelNotTheEnumName", () => {
    renderSection()

    expect(screen.getByText("Checked In")).toBeInTheDocument()
    expect(screen.queryByText("CheckedIn")).not.toBeInTheDocument()
  })

  it("TicketIssued_LinksItsCodeToTheTicketView", () => {
    renderSection()

    const link = screen.getByRole("link", { name: /EVT_ABC123/ })

    expect(link).toHaveAttribute("href", APP_ROUTES.eventTicketView("ticket-1"))
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("PerTicketResendButton_NamesTheTicketItWouldSend", () => {
    renderSection()

    expect(screen.getByRole("button", { name: "Resend ticket EVT_ABC123" })).toBeInTheDocument()
  })

  it("offers no resend at all when the order no longer allows it", () => {
    renderSection(LINE_ITEMS, false)

    expect(screen.queryByRole("button", { name: /resend all tickets/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /resend ticket EVT_ABC123/i })).not.toBeInTheDocument()
    expect(screen.getByText("EVT_ABC123")).toBeInTheDocument()
  })

  it("resending a single ticket asks for confirmation before calling the API", async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole("button", { name: /resend ticket EVT_ABC123/i }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("EVT_ABC123")).toBeInTheDocument()
    expect(resendEventInvoiceTicketMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: /resend ticket/i }))

    await waitFor(() => expect(resendEventInvoiceTicketMock).toHaveBeenCalledWith(INVOICE_UNIQUE_ID, "ticket-1"))
  })

  it("cancelling the confirmation does not call the API", async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole("button", { name: /resend ticket EVT_ABC123/i }))
    const dialog = await screen.findByRole("alertdialog")

    await user.click(within(dialog).getByRole("button", { name: /cancel/i }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(resendEventInvoiceTicketMock).not.toHaveBeenCalled()
  })

  it("shows the API error message on the dialog when the resend fails", async () => {
    resendEventInvoiceTicketMock.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole("button", { name: /resend ticket EVT_ABC123/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /resend ticket/i }))

    expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })
})

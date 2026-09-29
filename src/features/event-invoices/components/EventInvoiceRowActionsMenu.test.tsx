import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventInvoiceListItem } from "@/api/eventInvoices"
import { EventInvoiceRowActionsMenu } from "./EventInvoiceRowActionsMenu"

const INVOICE: EventInvoiceListItem = {
  invoiceUniqueId: "invoice-1",
  invoiceNo: "INV-1001",
  eventUniqueId: "event-1",
  eventName: "Spring Gala",
  buyerName: "Ada Lovelace",
  buyerEmail: "ada@example.com",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
  invoiceType: "Custom",
  dueDateUtc: "2026-06-01T00:00:00Z",
  companyName: "Northwind Traders",
  isOverdue: false,
  canMarkAsPaid: false,
  canCancel: false,
  canSend: false,
  canEdit: false,
  invoiceDateUtc: "2026-03-01T00:00:00Z",
  totalAmount: "240",
  balanceAmount: "0",
  paymentMethod: "CreditCard",
  paymentSource: "Visa ····4242",
  currencySymbol: "$",
  ticketCount: 2,
}

async function openMenu(overrides: Partial<EventInvoiceListItem> = {}) {
  const handlers = {
    onOpenDetail: vi.fn(),
    onEdit: vi.fn(),
    onMarkPaid: vi.fn(),
    onCancel: vi.fn(),
    onSend: vi.fn(),
  }

  render(
    <ChakraProvider value={system}>
      <EventInvoiceRowActionsMenu invoice={{ ...INVOICE, ...overrides }} {...handlers} />
    </ChakraProvider>,
  )

  await userEvent.click(screen.getByRole("button", { name: /Actions for invoice INV-1001/ }))

  return handlers
}

describe("EventInvoiceRowActionsMenu", () => {
  /** View is always offered and opens the row's own invoice, whatever state the invoice is in. */
  it("View_Clicked_OpensTheInvoiceDetail", async () => {
    const { onOpenDetail } = await openMenu()

    await userEvent.click(await screen.findByText("View"))

    expect(onOpenDetail).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  /** Edit is offered when the server marks the invoice editable, and it opens that invoice's form. */
  it("CanEdit_ShowsEdit_AndFiresHandler", async () => {
    const { onEdit } = await openMenu({ canEdit: true })

    await userEvent.click(await screen.findByText("Edit"))

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  /** Edit is offered only when the server marks the invoice editable, so a paid invoice can never be reopened from the list. */
  it("CannotEdit_HidesEdit", async () => {
    await openMenu({ canEdit: false })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Edit")).toBeNull()
  })

  /** Mark as paid is offered on an invoice still owed money, and it hands the row to the confirmation. */
  it("CanMarkAsPaid_ShowsMarkAsPaid_AndFiresHandler", async () => {
    const { onMarkPaid } = await openMenu({ canMarkAsPaid: true })

    await userEvent.click(await screen.findByText("Mark as paid"))

    expect(onMarkPaid).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  /** A settled or closed invoice never offers Mark as paid, so it cannot be recorded as paid twice. */
  it("CannotMarkAsPaid_HidesMarkAsPaid", async () => {
    await openMenu({ canMarkAsPaid: false })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Mark as paid")).toBeNull()
  })

  /** Cancel is offered on an invoice still owed money, and it hands the row to the destructive confirmation. */
  it("CanCancel_ShowsCancel_AndFiresHandler", async () => {
    const { onCancel } = await openMenu({ canCancel: true })

    await userEvent.click(await screen.findByText("Cancel invoice"))

    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  /** A paid or already-closed invoice never offers Cancel, so a settled record cannot be closed unpaid. */
  it("CannotCancel_HidesCancel", async () => {
    await openMenu({ canCancel: false })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Cancel invoice")).toBeNull()
  })

  /**
   * The resend action is offered for an order that has tickets and that the server allows to resend, and it
   * hands the row to the handler that opens the confirmation.
   */
  it("CanSendWithTickets_ShowsResendTickets_AndFiresHandler", async () => {
    const { onSend } = await openMenu({ canSend: true, ticketCount: 2 })

    await userEvent.click(await screen.findByText("Resend tickets"))

    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  /** A row the server refuses to resend - a cancelled order - never offers the action. */
  it("CannotSend_HidesResendTickets", async () => {
    await openMenu({ canSend: false })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Resend tickets")).toBeNull()
  })

  /**
   * An order with no tickets - every custom invoice - never offers the resend, because the delivery job would
   * find nothing to mail while the organizer is told it was sent.
   */
  it("CanSendButNoTickets_HidesResendTickets", async () => {
    await openMenu({ canSend: true, ticketCount: 0 })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Resend tickets")).toBeNull()
  })
})

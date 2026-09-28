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
  it("View_Clicked_OpensTheInvoiceDetail", async () => {
    const { onOpenDetail } = await openMenu()

    await userEvent.click(await screen.findByText("View"))

    expect(onOpenDetail).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  it("CanEdit_ShowsEdit_AndFiresHandler", async () => {
    const { onEdit } = await openMenu({ canEdit: true })

    await userEvent.click(await screen.findByText("Edit"))

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  it("CannotEdit_HidesEdit", async () => {
    await openMenu({ canEdit: false })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Edit")).toBeNull()
  })

  it("CanMarkAsPaid_ShowsMarkAsPaid_AndFiresHandler", async () => {
    const { onMarkPaid } = await openMenu({ canMarkAsPaid: true })

    await userEvent.click(await screen.findByText("Mark as paid"))

    expect(onMarkPaid).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  it("CannotMarkAsPaid_HidesMarkAsPaid", async () => {
    await openMenu({ canMarkAsPaid: false })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Mark as paid")).toBeNull()
  })

  it("CanCancel_ShowsCancel_AndFiresHandler", async () => {
    const { onCancel } = await openMenu({ canCancel: true })

    await userEvent.click(await screen.findByText("Cancel invoice"))

    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  it("CannotCancel_HidesCancel", async () => {
    await openMenu({ canCancel: false })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Cancel invoice")).toBeNull()
  })

  it("CanSend_ShowsSendToBuyer_AndFiresHandler", async () => {
    const { onSend } = await openMenu({ canSend: true })

    await userEvent.click(await screen.findByText("Send to buyer"))

    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  it("CannotSend_HidesSendToBuyer", async () => {
    await openMenu({ canSend: false })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Send to buyer")).toBeNull()
  })
})

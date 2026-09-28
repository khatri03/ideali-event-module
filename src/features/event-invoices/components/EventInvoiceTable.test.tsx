import { ChakraProvider } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import type { EventInvoiceListItem } from "@/api/eventInvoices"
import { system } from "@/theme"
import { EventInvoiceTable } from "./EventInvoiceTable"

const INVOICE: EventInvoiceListItem = {
  invoiceUniqueId: "invoice-1",
  invoiceNo: "INV-1001",
  invoiceStatus: "Paid",
  invoiceStatusLabel: "Paid",
  invoiceType: "Regular",
  dueDateUtc: null,
  companyName: null,
  isOverdue: false,
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  totalAmount: "251.78",
  balanceAmount: "251.78",
  currencySymbol: "$",
  buyerName: "Sohail Ahmed",
  buyerEmail: "sohail@example.com",
  eventUniqueId: "event-1",
  eventName: "APPNA 49th Annual Convention 2026",
  paymentMethod: "Stripe",
  paymentSource: "Visa ending 4242",
  ticketCount: 1,
}

const CUSTOM_OVERDUE_INVOICE: EventInvoiceListItem = {
  ...INVOICE,
  invoiceUniqueId: "invoice-2",
  invoiceNo: "INV-2002",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
  invoiceType: "Custom",
  dueDateUtc: "2026-01-01T00:00:00Z",
  companyName: "Northwind Traders",
  isOverdue: true,
}

function renderTable(invoices: EventInvoiceListItem[] = [INVOICE]) {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter>
        <EventInvoiceTable
          invoices={invoices}
          sortBy="invoiceDateUtc"
          sortOrder="desc"
          isFetching={false}
          onSortChange={vi.fn()}
          onOpenDetail={vi.fn()}
          onResendTickets={vi.fn()}
        />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

describe("EventInvoiceTable", () => {
  it("InvoiceNumber_RendersAsAnchorToInvoiceDetail", () => {
    renderTable()

    const link = screen.getByRole("link", { name: "INV-1001" })

    expect(link).toHaveAttribute("href", "/organizer/events/invoices/invoice-1")
  })

  it("CustomInvoice_ShowsCustomMarker_TicketInvoiceDoesNot", () => {
    renderTable([CUSTOM_OVERDUE_INVOICE, INVOICE])

    const markers = screen.getAllByText("Custom")

    expect(markers).toHaveLength(1)
  })

  it("OverdueCustomInvoice_ShowsOverduePillWithAriaLabel", () => {
    renderTable([CUSTOM_OVERDUE_INVOICE])

    expect(screen.getByLabelText("Overdue — due Jan 1, 2026")).toBeTruthy()
  })

  it("NonOverdueInvoice_HasNoOverduePill", () => {
    renderTable([INVOICE])

    expect(screen.queryByLabelText(/Overdue/)).toBeNull()
  })
})

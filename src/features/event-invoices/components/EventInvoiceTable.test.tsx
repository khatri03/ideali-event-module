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
  canMarkAsPaid: false,
  canCancel: false,
  canSend: true,
  canEdit: false,
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
          onEdit={vi.fn()}
          onMarkPaid={vi.fn()}
          onCancel={vi.fn()}
          onSend={vi.fn()}
        />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

describe("EventInvoiceTable", () => {
  /** The invoice number is a real link to its detail, so it can be opened in a new tab or reached by keyboard. */
  it("InvoiceNumber_RendersAsAnchorToInvoiceDetail", () => {
    renderTable()

    const link = screen.getByRole("link", { name: "INV-1001" })

    expect(link).toHaveAttribute("href", "/organizer/events/invoices/invoice-1")
  })

  /** Only a custom invoice carries the Custom marker, so ticket orders are never mistaken for sponsor billing. */
  it("CustomInvoice_ShowsCustomMarker_TicketInvoiceDoesNot", () => {
    renderTable([CUSTOM_OVERDUE_INVOICE, INVOICE])

    const markers = screen.getAllByText("Custom")

    expect(markers).toHaveLength(1)
  })

  /**
   * The overdue state is spoken, not only shown: the pill's text reads "Overdue, due ..." so a screen-reader
   * user hears what a sighted user sees from its colour and icon.
   */
  it("OverdueCustomInvoice_AnnouncesOverdueWithItsDueDate", () => {
    renderTable([CUSTOM_OVERDUE_INVOICE])

    expect(screen.getByText("Overdue, due").parentElement).toHaveTextContent("Overdue, due Jan 1, 2026")
  })

  /** An invoice that is not overdue shows its due date without any overdue wording, visible or spoken. */
  it("NonOverdueInvoice_HasNoOverduePill", () => {
    renderTable([{ ...CUSTOM_OVERDUE_INVOICE, isOverdue: false }])

    expect(screen.getByText("Jan 1, 2026")).toBeInTheDocument()
    expect(screen.queryByText(/Overdue/)).toBeNull()
  })
})

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
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  totalAmount: 251.78,
  balanceAmount: 251.78,
  currencySymbol: "$",
  buyerName: "Sohail Ahmed",
  buyerEmail: "sohail@example.com",
  eventName: "APPNA 49th Annual Convention 2026",
  paymentMethod: "Stripe",
  paymentSource: "Visa ending 4242",
  ticketCount: 1,
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
})

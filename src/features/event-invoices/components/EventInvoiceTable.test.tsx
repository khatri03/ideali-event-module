import { ChakraProvider } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
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

function TableFor({ invoices }: { invoices: EventInvoiceListItem[] }) {
  return (
    <EventInvoiceTable
      invoices={invoices}
      sortBy="invoiceDateUtc"
      sortOrder="desc"
      isFetching={false}
      onSortChange={vi.fn()}
      onOpenDetail={vi.fn()}
      onMarkPaid={vi.fn()}
      onCancel={vi.fn()}
      onSend={vi.fn()}
    />
  )
}

function renderTable(invoices: EventInvoiceListItem[] = [INVOICE]) {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter>
        <TableFor invoices={invoices} />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

describe("EventInvoiceTable", () => {
  /** Event Invoices lists registration orders only, so no row carries the Custom marker or a due date column. */
  it("EventInvoiceTable_RegistrationOnly_HasNoCustomMarkerOrDueDateColumn", () => {
    renderTable()

    expect(screen.queryByText("Custom")).toBeNull()
    expect(screen.queryByRole("columnheader", { name: /Due date/i })).toBeNull()
  })

  /** A ticket order's number is a real link to the Event invoice detail, so it opens in a new tab or by keyboard. */
  it("ListRow_TicketOrderNumber_OpensTheEventInvoiceDetailRoute", () => {
    renderTable()

    expect(screen.getByRole("link", { name: "INV-1001" })).toHaveAttribute("href", "/organizer/events/invoices/invoice-1")
  })

  /** Opening a row carries the list URL along, so back from its detail returns to the same filtered list. */
  it("ListRow_InvoiceNumber_KeepsTheListReturnState", async () => {
    function DetailProbe() {
      const location = useLocation()
      return <div data-testid="return-to">{(location.state as { returnTo?: string } | null)?.returnTo}</div>
    }
    render(
      <ChakraProvider value={system}>
        <MemoryRouter initialEntries={["/organizer/events/invoices?statuses=PendingPayment"]}>
          <Routes>
            <Route path="/organizer/events/invoices" element={<TableFor invoices={[INVOICE]} />} />
            <Route path="/organizer/events/invoices/:invoiceUniqueId" element={<DetailProbe />} />
          </Routes>
        </MemoryRouter>
      </ChakraProvider>,
    )

    await userEvent.click(screen.getByRole("link", { name: "INV-1001" }))

    expect(screen.getByTestId("return-to")).toHaveTextContent("/organizer/events/invoices?statuses=PendingPayment")
  })

})

describe("EventInvoiceTable scroll container", () => {
  /**
   * The table's scroll box is a positioned ancestor, so absolutely positioned screen-reader text is clipped by it;
   * otherwise that text escapes the box and scrolls the whole page sideways on a phone.
   */
  it("ScrollContainer_IsPositioned_SoHiddenTextStaysInsideIt", () => {
    renderTable([INVOICE])

    const scrollContainer = screen.getByRole("table").parentElement as HTMLElement

    expect(getComputedStyle(scrollContainer).overflow).toBe("auto")
    expect(getComputedStyle(scrollContainer).position).toBe("relative")
  })
})

describe("EventInvoiceTable buyer cell", () => {
  /** An order billed to a company leads with that company and still names the contact under it. */
  it("InvoiceWithCompany_ShowsCompanyAboveTheContactPerson", () => {
    renderTable([{ ...INVOICE, companyName: "Northwind Traders" }])

    const company = screen.getByText("Northwind Traders")
    const contact = screen.getByText("Sohail Ahmed")

    expect(company.compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText("sohail@example.com")).toBeInTheDocument()
  })

  /** A ticket order names only its buyer, so its row shows the person and email with no company line. */
  it("TicketInvoiceWithoutCompany_ShowsOnlyTheBuyerAndEmail", () => {
    renderTable([INVOICE])

    const cell = screen.getByText("Sohail Ahmed").parentElement as HTMLElement

    expect(cell).toHaveTextContent(/^Sohail Ahmedsohail@example\.com$/)
  })
})

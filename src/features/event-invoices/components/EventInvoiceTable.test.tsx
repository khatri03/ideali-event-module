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

function TableFor({ invoices }: { invoices: EventInvoiceListItem[] }) {
  return (
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
  /** A ticket order's number is a real link to the Event invoice detail, so it opens in a new tab or by keyboard. */
  it("ListRow_TicketOrderNumber_OpensTheEventInvoiceDetailRoute", () => {
    renderTable()

    expect(screen.getByRole("link", { name: "INV-1001" })).toHaveAttribute("href", "/organizer/events/invoices/invoice-1")
  })

  /** A custom row's number opens the custom invoice's own page, the only route that still serves it. */
  it("ListRow_CustomInvoiceNumber_OpensTheCustomInvoiceDetailRoute", () => {
    renderTable([CUSTOM_OVERDUE_INVOICE])

    expect(screen.getByRole("link", { name: "INV-2002" })).toHaveAttribute("href", "/organizer/custom-invoices/invoice-2")
  })

  /** Opening a custom row carries the list URL along, so back from its detail returns to the same filtered list. */
  it("ListRow_CustomInvoiceNumber_KeepsTheListReturnState", async () => {
    function DetailProbe() {
      const location = useLocation()
      return <div data-testid="return-to">{(location.state as { returnTo?: string } | null)?.returnTo}</div>
    }
    render(
      <ChakraProvider value={system}>
        <MemoryRouter initialEntries={["/organizer/events/invoices?statuses=PendingPayment"]}>
          <Routes>
            <Route path="/organizer/events/invoices" element={<TableFor invoices={[CUSTOM_OVERDUE_INVOICE]} />} />
            <Route path="/organizer/custom-invoices/:invoiceUniqueId" element={<DetailProbe />} />
          </Routes>
        </MemoryRouter>
      </ChakraProvider>,
    )

    await userEvent.click(screen.getByRole("link", { name: "INV-2002" }))

    expect(screen.getByTestId("return-to")).toHaveTextContent("/organizer/events/invoices?statuses=PendingPayment")
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

describe("EventInvoiceTable scroll container", () => {
  /**
   * The table's scroll box is a positioned ancestor, so the overdue pill's absolutely positioned screen-reader
   * text is clipped by it; otherwise that text escapes the box and scrolls the whole page sideways on a phone.
   */
  it("ScrollContainer_IsPositioned_SoHiddenOverdueTextStaysInsideIt", () => {
    renderTable([CUSTOM_OVERDUE_INVOICE])

    const scrollContainer = screen.getByRole("table").parentElement as HTMLElement

    expect(getComputedStyle(scrollContainer).overflow).toBe("auto")
    expect(getComputedStyle(scrollContainer).position).toBe("relative")
  })
})

describe("EventInvoiceTable buyer cell", () => {
  /** A custom invoice bills a company, so its row leads with that company and still names the contact under it. */
  it("CustomInvoiceWithCompany_ShowsCompanyAboveTheContactPerson", () => {
    renderTable([CUSTOM_OVERDUE_INVOICE])

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

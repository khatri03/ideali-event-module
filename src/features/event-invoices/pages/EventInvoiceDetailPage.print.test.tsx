import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { system } from "@/theme"
import { APP_ROUTES } from "@/utils/routes"
import EventInvoiceDetailPage from "./EventInvoiceDetailPage"

const { useEventInvoiceDetailMock, idleMutation } = vi.hoisted(() => ({
  useEventInvoiceDetailMock: vi.fn(),
  idleMutation: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))

vi.mock("../hooks/useEventInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useEventInvoices")>()
  return {
    ...actual,
    useEventInvoiceDetail: useEventInvoiceDetailMock,
    useResendEventInvoice: idleMutation,
    useResendEventInvoiceTicket: idleMutation,
    useResendEventInvoiceLineItem: idleMutation,
    useMarkEventInvoiceAsPaid: idleMutation,
    useCancelEventInvoice: idleMutation,
    useUnlinkEventInvoice: idleMutation,
    useAddEventInvoiceNote: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
    useUpdateEventInvoiceBuyer: idleMutation,
    useUpdateEventInvoiceAttendee: idleMutation,
  }
})

const CUSTOM_INVOICE: EventInvoiceDetail = {
  invoiceUniqueId: "invoice-1",
  invoiceNo: "CINV-3001",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  subTotal: "1800.75",
  discountAmount: null,
  discountCouponCode: null,
  taxAmount: null,
  platformCharges: null,
  serviceCharges: null,
  totalAmount: "1800.75",
  balanceAmount: "1800.75",
  currencySymbol: "$",
  eventUniqueId: "event-1",
  eventName: "Annual Convention",
  buyerName: "Ada Lovelace",
  buyerEmail: "ada@example.com",
  buyerPhone: null,
  charges: [],
  lineItems: [],
  customLineItems: [
    { invoiceItemUniqueId: "cline-1", description: "Headline sponsorship", amount: "1500.50" },
    { invoiceItemUniqueId: "cline-2", description: "Booth space", amount: "300.25" },
  ],
  notes: [],
  payments: [],
  invoiceType: "Custom",
  invoiceTypeLabel: "Custom",
  categoryName: "Gold Sponsor",
  dueDateUtc: "2026-01-01T00:00:00Z",
  isOverdue: true,
  specialNotes: "Bill to head office.",
  companyName: "Northwind Traders",
  buyerFirstName: "Ada",
  buyerMiddleName: "K",
  buyerLastName: "Lovelace",
  canMarkAsPaid: true,
  canCancel: true,
  canResendTickets: false,
  canEditBuyer: false,
  canEdit: true,
  canPayOnline: true,
  linkedInvoice: { invoiceUniqueId: "invoice-2", invoiceNo: "INV-900", invoiceStatusLabel: "Paid" },
}

function renderPage(overrides: Partial<EventInvoiceDetail> = {}) {
  useEventInvoiceDetailMock.mockReturnValue({
    data: { ...CUSTOM_INVOICE, ...overrides },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const detailPath = APP_ROUTES.eventInvoices.detail(CUSTOM_INVOICE.invoiceUniqueId)

  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[detailPath]}>
          <Routes>
            <Route path="/organizer/events/invoices/:invoiceUniqueId" element={<EventInvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

function printRegion(container: HTMLElement): HTMLElement {
  const region = container.querySelector<HTMLElement>("[data-print-region]")
  if (!region) throw new Error("The detail page is missing its print region.")
  return region
}

describe("EventInvoiceDetailPage print contract", () => {
  beforeEach(() => {
    useEventInvoiceDetailMock.mockReset()
  })

  /**
   * A printed custom invoice must read as the invoice itself: category, buyer, every billed line, the due
   * date and the grand total all belong on the sheet, inside the print region the browser prints.
   */
  it("keeps category, buyer, line items, due date and total inside the print region", () => {
    const { container } = renderPage()
    const region = within(printRegion(container))

    expect(region.getByText("Gold Sponsor")).toBeInTheDocument()
    expect(region.getByText("Northwind Traders")).toBeInTheDocument()
    expect(region.getByText("Headline sponsorship")).toBeInTheDocument()
    expect(region.getByText("Booth space")).toBeInTheDocument()
    expect(region.getByText(/Overdue/)).toBeInTheDocument()
    expect(region.getByText("$1,800.75")).toBeInTheDocument()
  })

  /** The payable link's URL is reference, not chrome: a printout is worthless if the reader cannot see where to pay. */
  it("keeps the payable link URL legible on the printed page", () => {
    const { container } = renderPage()
    const region = within(printRegion(container))

    expect(region.getByText(/\/events\/invoices\/invoice-1\/pay$/)).toBeInTheDocument()
  })

  /** Interactive controls mean nothing on paper, so the pay and email actions are dropped from the printout. */
  it("marks the pay and email action controls print-hidden", () => {
    renderPage()

    expect(screen.getByRole("button", { name: /email invoice to buyer/i }).closest("[data-print-hide]")).not.toBeNull()
    expect(screen.getByRole("link", { name: /open payment page/i }).closest("[data-print-hide]")).not.toBeNull()
  })

  /** An absent optional field prints nothing rather than an empty "Special notes" / "Linked invoice" box. */
  it("drops the empty special-notes and linked-invoice panels from the printout", () => {
    renderPage({ specialNotes: null, linkedInvoice: null })

    expect(screen.getByText("Special notes").closest("[data-print-hide]")).not.toBeNull()
    expect(screen.getByText("Linked invoice").closest("[data-print-hide]")).not.toBeNull()
  })

  /** When the optional fields are present they stay on the printout, so a real note is never dropped. */
  it("keeps the special-notes and linked-invoice panels when they carry content", () => {
    renderPage()

    expect(screen.getByText("Special notes").closest("[data-print-hide]")).toBeNull()
    expect(screen.getByText("Linked invoice").closest("[data-print-hide]")).toBeNull()
  })

  /** A long list of billed lines must all print; the card is allowed to break across pages rather than clip them. */
  it("renders every line of a long custom invoice", () => {
    const customLineItems = Array.from({ length: 14 }, (_item, index) => ({
      invoiceItemUniqueId: `cline-${index}`,
      description: `Billed line ${index + 1}`,
      amount: "100.00",
    }))
    const { container } = renderPage({ customLineItems })
    const region = within(printRegion(container))

    expect(region.getByText("Billed line 1")).toBeInTheDocument()
    expect(region.getByText("Billed line 14")).toBeInTheDocument()
    expect(container.querySelector("[data-print-allow-break]")).not.toBeNull()
  })
})

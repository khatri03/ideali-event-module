import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CustomInvoiceDetail } from "@/api/customInvoices"
import { system } from "@/theme"
import { APP_ROUTES } from "@/utils/routes"
import CustomInvoiceDetailPage from "./CustomInvoiceDetailPage"

const { useCustomInvoiceDetailMock, idleMutation } = vi.hoisted(() => ({
  useCustomInvoiceDetailMock: vi.fn(),
  idleMutation: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))

vi.mock("../hooks/useCustomInvoices", () => ({
  useCustomInvoiceDetail: useCustomInvoiceDetailMock,
  useCustomInvoiceDetailActions: () => ({
    markPaid: idleMutation(),
    cancel: idleMutation(),
    emailInvoice: idleMutation(),
    addNote: idleMutation(),
  }),
  useUnlinkCustomInvoice: idleMutation,
  useLinkCustomInvoice: idleMutation,
}))

const CUSTOM_INVOICE: CustomInvoiceDetail = {
  invoiceUniqueId: "invoice-1",
  invoiceNo: "CINV-3001",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  moduleType: "Event",
  entityUniqueId: "event-1",
  entityName: "Annual Convention",
  categoryName: "Gold Sponsor",
  dueDateUtc: "2026-01-01T00:00:00Z",
  isOverdue: true,
  specialNotes: "Bill to head office.",
  companyName: "Northwind Traders",
  buyerFirstName: "Ada",
  buyerMiddleName: "K",
  buyerLastName: "Lovelace",
  buyerName: "Ada Lovelace",
  buyerEmail: "ada@example.com",
  buyerPhone: null,
  subTotal: "1800.75",
  totalAmount: "1800.75",
  balanceAmount: "1800.75",
  currencySymbol: "$",
  lineItems: [
    { invoiceItemUniqueId: "cline-1", description: "Headline sponsorship", amount: "1500.50" },
    { invoiceItemUniqueId: "cline-2", description: "Booth space", amount: "300.25" },
  ],
  linkedInvoice: { invoiceUniqueId: "invoice-2", invoiceNo: "INV-900", invoiceStatusLabel: "Paid" },
  notes: [],
  payments: [],
  canEdit: true,
  canMarkAsPaid: true,
  canCancel: true,
  canPayOnline: true,
  canSend: true,
}

function renderPage(overrides: Partial<CustomInvoiceDetail> = {}) {
  useCustomInvoiceDetailMock.mockReturnValue({
    data: { ...CUSTOM_INVOICE, ...overrides },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const detailPath = APP_ROUTES.customInvoices.detail(CUSTOM_INVOICE.invoiceUniqueId)

  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[detailPath]}>
          <Routes>
            <Route path={APP_ROUTES.customInvoices.detailRoute} element={<CustomInvoiceDetailPage />} />
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

describe("CustomInvoiceDetailPage print contract", () => {
  beforeEach(() => {
    useCustomInvoiceDetailMock.mockReset()
  })

  /**
   * A printed custom invoice must read as the invoice itself: category, buyer, every billed line, the due
   * date and the grand total all belong on the sheet, inside the print region the browser prints.
   */
  it("CustomDetail_Print_HidesActionsAndKeepsTheInvoiceBody", () => {
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

    expect(region.getByText(/\/custom-invoices\/invoice-1\/pay$/)).toBeInTheDocument()
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
    const { container } = renderPage({ lineItems: customLineItems })
    const region = within(printRegion(container))

    expect(region.getByText("Billed line 1")).toBeInTheDocument()
    expect(region.getByText("Billed line 14")).toBeInTheDocument()
    expect(container.querySelector("[data-print-allow-break]")).not.toBeNull()
  })

  /** A printed Membership invoice names the membership type with its module label, where an Event invoice names its event. */
  it("keeps the labelled Membership entity inside the print region", () => {
    const { container } = renderPage({ moduleType: "Membership", entityUniqueId: "type-1", entityName: "Gold Membership" })

    expect(within(printRegion(container)).getByText("Membership: Gold Membership")).toBeInTheDocument()
  })
})

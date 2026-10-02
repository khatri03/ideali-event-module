import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { system } from "@/theme"
import { APP_ROUTES } from "@/utils/routes"
import EventInvoiceDetailPage from "./EventInvoiceDetailPage"

const { useEventInvoiceDetailMock, addNoteMock, idleMutation } = vi.hoisted(() => ({
  useEventInvoiceDetailMock: vi.fn(),
  addNoteMock: vi.fn(),
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
    useAddEventInvoiceNote: () => ({ mutateAsync: addNoteMock, reset: vi.fn(), isPending: false, error: null }),
    useUpdateEventInvoiceBuyer: idleMutation,
    useUpdateEventInvoiceAttendee: idleMutation,
  }
})

const INVOICE: EventInvoiceDetail = {
  invoiceUniqueId: "invoice-1",
  invoiceNo: "INV-2001",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  subTotal: "420",
  discountAmount: null,
  discountCouponCode: null,
  taxAmount: null,
  platformCharges: null,
  serviceCharges: null,
  totalAmount: "420",
  balanceAmount: "420",
  currencySymbol: "$",
  eventUniqueId: "event-1",
  eventName: "Annual Convention",
  buyerName: "Jane Doe",
  buyerEmail: "jane@example.com",
  buyerPhone: null,
  charges: [],
  lineItems: [
    {
      invoiceItemUniqueId: "line-1",
      sessionUniqueId: "session-1",
      sessionName: "Friday Dinner",
      ticketTypeName: "Aga Khan",
      quantity: 2,
      unitPrice: "210",
      lineTotal: "420",
      attendees: [],
      tickets: [],
    },
  ],
  notes: [],
  payments: [],
  invoiceType: "Regular",
  invoiceTypeLabel: "Regular",
  canMarkAsPaid: true,
  canCancel: true,
  canResendTickets: true,
  canEditBuyer: true,
}

function CurrentPath() {
  const location = useLocation()
  return <div data-testid="current-path">{`${location.pathname}${location.search}`}</div>
}

function renderPage({ returnTo }: { returnTo?: unknown } = {}) {
  const detailPath = APP_ROUTES.eventInvoices.detail(INVOICE.invoiceUniqueId)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            { pathname: detailPath, state: returnTo === undefined ? undefined : { returnTo } },
          ]}
        >
          <CurrentPath />
          <Routes>
            <Route path={APP_ROUTES.eventInvoices.list} element={<div>Invoice list</div>} />
            <Route path="/organizer/events/invoices/:invoiceUniqueId" element={<EventInvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

function loaded(overrides: Partial<EventInvoiceDetail> = {}) {
  useEventInvoiceDetailMock.mockReturnValue({
    data: { ...INVOICE, ...overrides },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })
}

function notFound() {
  return new AxiosError("Not Found", "404", undefined, undefined, {
    status: 404,
    data: {},
    statusText: "Not Found",
    headers: {},
    config: { headers: {} },
  } as never)
}

function failedWith(error: unknown, { refetch = vi.fn(), isFetching = false } = {}) {
  useEventInvoiceDetailMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    isFetching,
    error,
    refetch,
  })
}

describe("EventInvoiceDetailPage", () => {
  beforeEach(() => {
    useEventInvoiceDetailMock.mockReset()
    addNoteMock.mockReset()
    addNoteMock.mockResolvedValue(undefined)
  })

  /** The settle decision sits above the order totals it applies to, so it is made before reading past it. */
  it("InvoiceLoaded_PutsTheSettlementDecisionAboveTheMoneyItAppliesTo", () => {
    loaded()
    const { container } = renderPage()

    const markPaid = screen.getByRole("button", { name: /mark as paid/i })
    const subtotal = screen.getByText("Line Item Total")

    expect(container.compareDocumentPosition(markPaid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(markPaid.compareDocumentPosition(subtotal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /** Ticket delivery and payments come before internal notes, the order an organizer works through them. */
  it("InvoiceLoaded_OrdersOperationalSectionsAheadOfInternalNotes", () => {
    loaded()
    renderPage()

    const ticketDelivery = screen.getByRole("heading", { name: /ticket delivery/i })
    const paymentAttempts = screen.getByRole("heading", { name: /payment attempts/i })
    const notes = screen.getByRole("button", { name: /add note/i })

    expect(ticketDelivery.compareDocumentPosition(paymentAttempts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(paymentAttempts.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /** A ticket line is listed once, never repeated between the totals and the line items. */
  it("TicketLines_AppearExactlyOnceOnThePage", () => {
    loaded()
    renderPage()

    expect(screen.getAllByText("Aga Khan")).toHaveLength(1)
  })

  /** A settled order offers no settlement action the server would refuse. */
  it("OrderAlreadySettled_ShowsNoSettlementButtons", () => {
    loaded({ canMarkAsPaid: false, canCancel: false, invoiceStatus: "Paid", invoiceStatusLabel: "Paid" })
    renderPage()

    expect(screen.queryByRole("button", { name: /mark as paid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mark as cancelled/i })).not.toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
  })

  /** Back returns to the filtered list the order was opened from, not a reset one. */
  it("OpenedFromAFilteredList_ReturnsToThatSameList", async () => {
    loaded()
    const user = userEvent.setup()
    renderPage({ returnTo: "/organizer/events/invoices?eventUniqueId=event-1" })

    await user.click(screen.getByRole("button", { name: /back to invoices/i }))

    expect(screen.getByTestId("current-path")).toHaveTextContent(
      "/organizer/events/invoices?eventUniqueId=event-1",
    )
  })

  /** Opened from a bookmark, back lands on the plain Event Invoices list. */
  it("OpenedDirectlyByUrl_FallsBackToThePlainList", async () => {
    loaded()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: /back to invoices/i }))

    expect(screen.getByTestId("current-path")).toHaveTextContent(APP_ROUTES.eventInvoices.list)
  })

  /** A history state pointing off-site is refused, so back can never become an open redirect. */
  it("ReturnPathPointingOffSite_IsRefusedInFavourOfTheList", async () => {
    loaded()
    const user = userEvent.setup()
    renderPage({ returnTo: "//evil.example.com/steal" })

    await user.click(screen.getByRole("button", { name: /back to invoices/i }))

    expect(screen.getByTestId("current-path")).toHaveTextContent(APP_ROUTES.eventInvoices.list)
  })

  /** A failed load explains itself and still offers the way back. */
  it("DetailRequestFailed_ShowsTheErrorAndKeepsAWayBack", () => {
    failedWith(new Error("boom"))
    renderPage()

    expect(screen.getByRole("alert")).toHaveTextContent(/an unexpected error occurred/i)
    expect(screen.getByRole("button", { name: /back to invoices/i })).toBeInTheDocument()
  })

  /** A transient failure can be retried in place. */
  it("TransientFailure_OffersARetryThatRefetches", async () => {
    const refetch = vi.fn()
    failedWith(new Error("boom"), { refetch })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: /try again/i }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  /** An order that is gone or not the organizer's says so and offers no retry that cannot succeed. */
  it("InvoiceGoneOrNotTheirs_SaysSoAndOffersNoPointlessRetry", () => {
    failedWith(notFound())
    renderPage()

    expect(screen.getByRole("alert")).toHaveTextContent(/invoice not found/i)
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument()
  })

  /** A retry in flight shows as busy so it is not pressed twice. */
  it("RetryAlreadyInFlight_ShowsTheButtonBusyRatherThanIdle", () => {
    failedWith(new Error("boom"), { isFetching: true })
    renderPage()

    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled()
  })

  /** Print hands the order to the browser print dialog. */
  it("Print_HandsTheInvoiceToTheBrowserPrintDialog", async () => {
    loaded()
    const print = vi.fn()
    vi.stubGlobal("print", print)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: /^print$/i }))

    expect(print).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  /** Only the order prints; its controls are marked as chrome and dropped. */
  it("Print_MarksTheInvoiceAsThePrintableRegionAndTheControlsAsChrome", () => {
    loaded()
    const { container } = renderPage()

    expect(container.querySelector("[data-print-region]")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^print$/i }).closest("[data-print-hide]")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /mark as paid/i }).closest("[data-print-hide]")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add note/i })).toHaveAttribute("data-print-hide")
  })

  /** The header names the event the order belongs to and opens it, so the organizer can reach the event in one click. */
  it("TicketOrder_HeaderLinksToTheEventItBelongsTo", () => {
    loaded()
    renderPage()

    expect(screen.getByRole("link", { name: /annual convention/i })).toHaveAttribute(
      "href",
      APP_ROUTES.eventWizard.edit("event-1"),
    )
  })

  /** A ticket order is never edited through the custom-invoice form, so its detail offers no Edit. */
  it("TicketOrder_OffersNoEdit", () => {
    loaded()
    renderPage()

    expect(screen.queryByRole("link", { name: /^edit$/i })).not.toBeInTheDocument()
  })

  /** Links exist only between custom invoices now, so a ticket order carries no linked-invoice panel at all. */
  it("TicketOrder_ShowsNoLinkedInvoicePanel", () => {
    loaded()
    renderPage()

    expect(screen.queryByText("Linked invoice")).not.toBeInTheDocument()
  })

  /** While loading, the page shows its skeleton rather than an empty area. */
  it("StillLoading_ShowsTheSkeletonRatherThanAnEmptyPage", () => {
    useEventInvoiceDetailMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: true,
      error: null,
      refetch: vi.fn(),
    })
    const { container } = renderPage()

    expect(container.querySelectorAll(".chakra-skeleton").length).toBeGreaterThan(0)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

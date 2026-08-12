import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { system } from "@/theme"
import { APP_ROUTES } from "@/utils/routes"
import EventInvoiceDetailPage from "./EventInvoiceDetailPage"

const { useEventInvoiceDetailMock, idleMutation } = vi.hoisted(() => ({
  useEventInvoiceDetailMock: vi.fn(),
  idleMutation: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))

vi.mock("../hooks/useEventInvoices", () => ({
  useEventInvoiceDetail: useEventInvoiceDetailMock,
  useResendEventInvoice: idleMutation,
  useResendEventInvoiceTicket: idleMutation,
  useMarkEventInvoiceAsPaid: idleMutation,
  useCancelEventInvoice: idleMutation,
  useAddEventInvoiceNote: idleMutation,
}))

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

  return render(
    <ChakraProvider value={system}>
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
  })

  it("InvoiceLoaded_PutsTheSettlementDecisionAboveTheMoneyItAppliesTo", () => {
    loaded()
    const { container } = renderPage()

    const markPaid = screen.getByRole("button", { name: /mark as paid/i })
    const subtotal = screen.getByText("Line Item Total")

    expect(container.compareDocumentPosition(markPaid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(markPaid.compareDocumentPosition(subtotal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("InvoiceLoaded_OrdersOperationalSectionsAheadOfInternalNotes", () => {
    loaded()
    renderPage()

    const ticketDelivery = screen.getByRole("heading", { name: /ticket delivery/i })
    const paymentAttempts = screen.getByRole("heading", { name: /payment attempts/i })
    const notes = screen.getByRole("button", { name: /add note/i })

    expect(ticketDelivery.compareDocumentPosition(paymentAttempts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(paymentAttempts.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("TicketLines_AppearExactlyOnceOnThePage", () => {
    loaded()
    renderPage()

    expect(screen.getAllByText("Aga Khan")).toHaveLength(1)
  })

  it("OrderAlreadySettled_ShowsNoSettlementButtons", () => {
    loaded({ canMarkAsPaid: false, canCancel: false, invoiceStatus: "Paid", invoiceStatusLabel: "Paid" })
    renderPage()

    expect(screen.queryByRole("button", { name: /mark as paid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mark as cancelled/i })).not.toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
  })

  it("OpenedFromAFilteredList_ReturnsToThatSameList", async () => {
    loaded()
    const user = userEvent.setup()
    renderPage({ returnTo: "/organizer/events/invoices?eventUniqueId=event-1" })

    await user.click(screen.getByRole("button", { name: /back to invoices/i }))

    expect(screen.getByTestId("current-path")).toHaveTextContent(
      "/organizer/events/invoices?eventUniqueId=event-1",
    )
  })

  it("OpenedDirectlyByUrl_FallsBackToThePlainList", async () => {
    loaded()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: /back to invoices/i }))

    expect(screen.getByTestId("current-path")).toHaveTextContent(APP_ROUTES.eventInvoices.list)
  })

  it("ReturnPathPointingOffSite_IsRefusedInFavourOfTheList", async () => {
    loaded()
    const user = userEvent.setup()
    renderPage({ returnTo: "//evil.example.com/steal" })

    await user.click(screen.getByRole("button", { name: /back to invoices/i }))

    expect(screen.getByTestId("current-path")).toHaveTextContent(APP_ROUTES.eventInvoices.list)
  })

  it("DetailRequestFailed_ShowsTheErrorAndKeepsAWayBack", () => {
    failedWith(new Error("boom"))
    renderPage()

    expect(screen.getByRole("alert")).toHaveTextContent(/an unexpected error occurred/i)
    expect(screen.getByRole("button", { name: /back to invoices/i })).toBeInTheDocument()
  })

  it("TransientFailure_OffersARetryThatRefetches", async () => {
    const refetch = vi.fn()
    failedWith(new Error("boom"), { refetch })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: /try again/i }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it("InvoiceGoneOrNotTheirs_SaysSoAndOffersNoPointlessRetry", () => {
    failedWith(notFound())
    renderPage()

    expect(screen.getByRole("alert")).toHaveTextContent(/invoice not found/i)
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument()
  })

  it("RetryAlreadyInFlight_ShowsTheButtonBusyRatherThanIdle", () => {
    failedWith(new Error("boom"), { isFetching: true })
    renderPage()

    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled()
  })

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

  it("Print_MarksTheInvoiceAsThePrintableRegionAndTheControlsAsChrome", () => {
    loaded()
    const { container } = renderPage()

    expect(container.querySelector("[data-print-region]")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^print$/i }).closest("[data-print-hide]")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /mark as paid/i }).closest("[data-print-hide]")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add note/i })).toHaveAttribute("data-print-hide")
  })

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

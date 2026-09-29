import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
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
  customLineItems: [],
  notes: [],
  payments: [],
  invoiceType: "Regular",
  invoiceTypeLabel: "Regular",
  categoryName: null,
  dueDateUtc: null,
  isOverdue: false,
  specialNotes: null,
  companyName: null,
  buyerFirstName: null,
  buyerMiddleName: null,
  buyerLastName: null,
  canMarkAsPaid: true,
  canCancel: true,
  canResendTickets: true,
  canEditBuyer: true,
  canEdit: false,
  linkedInvoice: null,
}

const CUSTOM_INVOICE: Partial<EventInvoiceDetail> = {
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
  canEdit: true,
  lineItems: [],
  customLineItems: [
    { invoiceItemUniqueId: "cline-1", description: "Headline sponsorship", amount: "1500.50" },
    { invoiceItemUniqueId: "cline-2", description: "Booth space", amount: "300.25" },
  ],
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

  it("CustomInvoice_RendersTheCustomBodyWithLinesCategoryAndOverdueDueDate", () => {
    loaded(CUSTOM_INVOICE)
    renderPage()

    expect(screen.getByText("Northwind Traders")).toBeInTheDocument()
    expect(screen.getByText("Ada K Lovelace")).toBeInTheDocument()
    expect(screen.getByText("Gold Sponsor")).toBeInTheDocument()
    expect(screen.getByText("Headline sponsorship")).toBeInTheDocument()
    expect(screen.getByText("Grand total")).toBeInTheDocument()
    expect(screen.getByText(/Overdue/)).toBeInTheDocument()
    // The ticket-centric body must not render for a custom invoice.
    expect(screen.queryByRole("heading", { name: /ticket delivery/i })).not.toBeInTheDocument()
  })

  it("TicketInvoice_StillRendersTheTicketBodyNotTheCustomOne", () => {
    loaded()
    renderPage()

    expect(screen.getByRole("heading", { name: /ticket delivery/i })).toBeInTheDocument()
    expect(screen.queryByText("Grand total")).not.toBeInTheDocument()
  })

  it("CustomInvoicePaidOrCancelled_CollapsesThePayableLinkToItsStatusSentence", () => {
    loaded({ ...CUSTOM_INVOICE, invoiceStatus: "Paid", invoiceStatusLabel: "Paid", isOverdue: false })
    renderPage()

    expect(screen.getByText(/no payable link is needed/i)).toBeInTheDocument()
  })

  it("AddNoteAfterCreation_SavesTheNoteAndKeepsTheShippedDialog", async () => {
    loaded(CUSTOM_INVOICE)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: /add note/i }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Chased head office." } })
    await user.click(within(dialog).getByRole("button", { name: /save note/i }))

    expect(addNoteMock).toHaveBeenCalledWith("Chased head office.")
  })

  /** A link is reciprocal: the ticket invoice a custom invoice points at must show the reference back. */
  it("TicketInvoiceThatIsLinked_ShowsTheReferenceBackToTheCustomInvoice", () => {
    loaded({ linkedInvoice: { invoiceUniqueId: "invoice-9", invoiceNo: "INV-9009", invoiceStatusLabel: "Pending Payment" } })
    renderPage()

    expect(screen.getByText("Linked invoice")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "INV-9009" })).toHaveAttribute("href", "/organizer/events/invoices/invoice-9")
  })

  /** An unlinked ticket invoice is never a link source, so it carries no empty link panel to clutter the page. */
  it("TicketInvoiceNotLinked_ShowsNoLinkedInvoicePanel", () => {
    loaded()
    renderPage()

    expect(screen.queryByText("Linked invoice")).not.toBeInTheDocument()
  })

  /** A standalone custom invoice still shows the panel, so the organizer knows it can be linked. */
  it("CustomInvoiceNotLinked_ShowsTheNotLinkedSentence", () => {
    loaded(CUSTOM_INVOICE)
    renderPage()

    expect(screen.getByText("Not linked to another invoice.")).toBeInTheDocument()
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

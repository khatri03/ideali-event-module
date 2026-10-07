import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventInvoiceFilters, EventInvoiceListItem } from "@/api/eventInvoices"
import { EventInvoicesPage } from "./EventInvoicesPage"

const {
  useEventInvoicesMock,
  useEventInvoiceFilterOptionsMock,
  useResendEventInvoiceMock,
  useMarkEventInvoiceAsPaidMock,
  useCancelEventInvoiceMock,
} = vi.hoisted(() => ({
  useEventInvoicesMock: vi.fn(),
  useEventInvoiceFilterOptionsMock: vi.fn(),
  useResendEventInvoiceMock: vi.fn(),
  useMarkEventInvoiceAsPaidMock: vi.fn(),
  useCancelEventInvoiceMock: vi.fn(),
}))

vi.mock("../hooks/useEventInvoices", () => ({
  useEventInvoices: useEventInvoicesMock,
  useEventInvoiceFilterOptions: useEventInvoiceFilterOptionsMock,
  useResendEventInvoice: useResendEventInvoiceMock,
  useMarkEventInvoiceAsPaid: useMarkEventInvoiceAsPaidMock,
  useCancelEventInvoice: useCancelEventInvoiceMock,
}))

function renderAt(path: string) {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter initialEntries={[path]}>
        <EventInvoicesPage />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

const TICKET_ROW: EventInvoiceListItem = {
  invoiceUniqueId: "invoice-2",
  invoiceNo: "INV-2002",
  eventUniqueId: "event-1",
  eventName: "Annual Convention",
  buyerName: "Ada Lovelace",
  buyerEmail: "ada@example.com",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
  invoiceType: "Regular",
  dueDateUtc: null,
  companyName: null,
  isOverdue: false,
  canMarkAsPaid: true,
  canCancel: true,
  canSend: true,
  canEdit: false,
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  totalAmount: "1500",
  balanceAmount: "1500",
  paymentMethod: "Stripe",
  paymentSource: "Visa ending 4242",
  currencySymbol: "$",
  ticketCount: 1,
}

function CurrentPath() {
  const location = useLocation()
  return <div data-testid="current-path">{location.pathname}</div>
}

function renderListWithRoutes() {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter initialEntries={["/organizer/events/invoices"]}>
        <CurrentPath />
        <Routes>
          <Route path="/organizer/events/invoices" element={<EventInvoicesPage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </ChakraProvider>,
  )
}

function appliedFilters(): EventInvoiceFilters {
  const lastCall = useEventInvoicesMock.mock.calls.at(-1)
  if (!lastCall) throw new Error("useEventInvoices was never called")
  return lastCall[0] as EventInvoiceFilters
}

describe("EventInvoicesPage", () => {
  beforeEach(() => {
    useEventInvoicesMock.mockReset().mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
      isError: false,
      isFetching: false,
      error: null,
    })
    useEventInvoiceFilterOptionsMock.mockReset().mockReturnValue({ data: { events: [], sessions: [] }, isLoading: false })
    const settlementMutation = () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null })
    useResendEventInvoiceMock.mockReset().mockReturnValue(settlementMutation())
    useMarkEventInvoiceAsPaidMock.mockReset().mockReturnValue(settlementMutation())
    useCancelEventInvoiceMock.mockReset().mockReturnValue(settlementMutation())
  })

  /** The event card links here with the event it was opened from — the list must land narrowed. */
  it("EventUniqueIdInTheUrl_FiltersToThatEventWithoutAnyClick", () => {
    renderAt("/organizer/events/invoices?eventUniqueId=event-1")

    expect(appliedFilters().eventUniqueIds).toEqual(["event-1"])
  })

  /** Without an event in the URL the list is not narrowed to any event. */
  it("NoEventUniqueIdInTheUrl_ShowsEveryEventsInvoices", () => {
    renderAt("/organizer/events/invoices")

    expect(appliedFilters().eventUniqueIds).toEqual([])
  })

  /** Unpaid and cancelled invoices are noise on arrival — the organizer opens this page for paid ones. */
  it("FirstLoad_FiltersToPaidInvoices", () => {
    renderAt("/organizer/events/invoices")

    expect(appliedFilters().statuses).toEqual(["Paid"])
  })

  /** Clear removes the default Paid filter, so every status can be seen. */
  it("Clear_DropsTheDefaultPaidFilterSoEveryStatusShows", async () => {
    renderAt("/organizer/events/invoices")

    await userEvent.click(screen.getByRole("button", { name: /clear/i }))

    expect(appliedFilters().statuses).toEqual([])
  })

  /** A blank event id in the URL never filters the list down to nothing. */
  it("BlankEventUniqueId_ShowsEveryInvoiceRatherThanFilteringOnNothing", () => {
    renderAt("/organizer/events/invoices?eventUniqueId=%20")

    expect(appliedFilters().eventUniqueIds).toEqual([])
  })

  /** Custom invoices have their own list, so every request from this page asks for registration invoices only (D-06). */
  it("EventInvoicesPage_ListRequest_AlwaysSendsRegularOnly", async () => {
    renderAt("/organizer/events/invoices")
    expect(appliedFilters()).toMatchObject({ invoiceTypes: ["Regular"], overdueOnly: false })

    await userEvent.click(screen.getByRole("button", { name: /apply/i }))
    expect(appliedFilters()).toMatchObject({ invoiceTypes: ["Regular"], overdueOnly: false })

    await userEvent.click(screen.getByRole("button", { name: /clear/i }))
    expect(appliedFilters()).toMatchObject({ invoiceTypes: ["Regular"], overdueOnly: false })
  })

  /** A registration row's View opens the Event invoice detail, and the row offers no Edit (D-06). */
  it("ListRow_View_OpensTheEventInvoiceDetailWithNoEditOffered", async () => {
    useEventInvoicesMock.mockReturnValue({
      data: { items: [TICKET_ROW], total: 1, page: 1, pageSize: 20, totalPages: 1 },
      isError: false,
      isFetching: false,
      error: null,
    })
    renderListWithRoutes()

    await userEvent.click(screen.getByRole("button", { name: /actions for invoice INV-2002/i }))
    expect(screen.queryByText("Edit")).toBeNull()
    await userEvent.click(await screen.findByText("View"))

    expect(screen.getByTestId("current-path")).toHaveTextContent("/organizer/events/invoices/invoice-2")
  })

  /** Custom invoices are created from their own list now, so Event Invoices keeps its heading but offers no way in (D-07). */
  it("EventInvoicesPage_NoNewCustomInvoiceButton", () => {
    renderListWithRoutes()

    expect(screen.getByRole("heading", { name: "Event Invoices" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /new custom invoice/i })).toBeNull()
    expect(screen.queryByText(/custom invoice/i)).toBeNull()
  })
})

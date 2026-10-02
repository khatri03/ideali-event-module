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

const CUSTOM_ROW: EventInvoiceListItem = {
  invoiceUniqueId: "invoice-2",
  invoiceNo: "CINV-2002",
  eventUniqueId: "event-1",
  eventName: "Annual Convention",
  buyerName: "Ada Lovelace",
  buyerEmail: "ada@example.com",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
  invoiceType: "Custom",
  dueDateUtc: "2026-12-31T00:00:00Z",
  companyName: "Northwind Traders",
  isOverdue: false,
  canMarkAsPaid: true,
  canCancel: true,
  canSend: true,
  canEdit: true,
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  totalAmount: "1500",
  balanceAmount: "1500",
  paymentMethod: null,
  paymentSource: null,
  currencySymbol: "$",
  ticketCount: 0,
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

  /** A custom row's Edit opens the custom-invoice form on its own route, never the retired Event custom route. */
  it("ListRow_CustomInvoiceEdit_OpensTheCustomEditRoute", async () => {
    useEventInvoicesMock.mockReturnValue({
      data: { items: [CUSTOM_ROW], total: 1, page: 1, pageSize: 20, totalPages: 1 },
      isError: false,
      isFetching: false,
      error: null,
    })
    renderListWithRoutes()

    await userEvent.click(screen.getByRole("button", { name: /actions for invoice CINV-2002/i }))
    await userEvent.click(await screen.findByText("Edit"))

    expect(screen.getByTestId("current-path")).toHaveTextContent("/organizer/custom-invoices/invoice-2/edit")
  })

  /** A custom row's View opens the custom invoice's own detail page. */
  it("ListRow_CustomInvoiceView_OpensTheCustomInvoiceDetailRoute", async () => {
    useEventInvoicesMock.mockReturnValue({
      data: { items: [CUSTOM_ROW], total: 1, page: 1, pageSize: 20, totalPages: 1 },
      isError: false,
      isFetching: false,
      error: null,
    })
    renderListWithRoutes()

    await userEvent.click(screen.getByRole("button", { name: /actions for invoice CINV-2002/i }))
    await userEvent.click(await screen.findByText("View"))

    expect(screen.getByTestId("current-path")).toHaveTextContent("/organizer/custom-invoices/invoice-2")
  })
})

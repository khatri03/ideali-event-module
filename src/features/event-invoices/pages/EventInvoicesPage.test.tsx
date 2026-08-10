import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventInvoiceFilters } from "@/api/eventInvoices"
import { EventInvoicesPage } from "./EventInvoicesPage"

const { useEventInvoicesMock, useEventInvoiceFilterOptionsMock } = vi.hoisted(() => ({
  useEventInvoicesMock: vi.fn(),
  useEventInvoiceFilterOptionsMock: vi.fn(),
}))

vi.mock("../hooks/useEventInvoices", () => ({
  useEventInvoices: useEventInvoicesMock,
  useEventInvoiceFilterOptions: useEventInvoiceFilterOptionsMock,
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
  })

  /** The event card links here with the event it was opened from — the list must land narrowed. */
  it("EventUniqueIdInTheUrl_FiltersToThatEventWithoutAnyClick", () => {
    renderAt("/organizer/events/invoices?eventUniqueId=event-1")

    expect(appliedFilters().eventUniqueIds).toEqual(["event-1"])
  })

  it("NoEventUniqueIdInTheUrl_ShowsEveryEventsInvoices", () => {
    renderAt("/organizer/events/invoices")

    expect(appliedFilters().eventUniqueIds).toEqual([])
  })

  /** Unpaid and cancelled invoices are noise on arrival — the organizer opens this page for paid ones. */
  it("FirstLoad_FiltersToPaidInvoices", () => {
    renderAt("/organizer/events/invoices")

    expect(appliedFilters().statuses).toEqual(["Paid"])
  })

  it("Clear_DropsTheDefaultPaidFilterSoEveryStatusShows", async () => {
    renderAt("/organizer/events/invoices")

    await userEvent.click(screen.getByRole("button", { name: /clear/i }))

    expect(appliedFilters().statuses).toEqual([])
  })

  it("BlankEventUniqueId_ShowsEveryInvoiceRatherThanFilteringOnNothing", () => {
    renderAt("/organizer/events/invoices?eventUniqueId=%20")

    expect(appliedFilters().eventUniqueIds).toEqual([])
  })
})

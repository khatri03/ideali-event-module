import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { system } from "@/theme"
import { EventReportTabs } from "./EventReportTabs"

const { summaryMock, forSaleMock, statusChangesMock, renderContextMock } = vi.hoisted(() => ({
  summaryMock: vi.fn(),
  forSaleMock: vi.fn(),
  statusChangesMock: vi.fn(),
  renderContextMock: vi.fn(),
}))

vi.mock("@/api/seatsio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/seatsio")>()),
  fetchSeatsIoEventSummary: summaryMock,
  fetchSeatsIoEventForSale: forSaleMock,
  fetchSeatsIoEventStatusChanges: statusChangesMock,
  fetchSeatsIoEventRenderContext: renderContextMock,
}))

const EVENT_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"

function renderTabs() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EventReportTabs eventUniqueId={EVENT_UNIQUE_ID} />
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("EventReportTabs", () => {
  beforeEach(() => {
    summaryMock.mockReset().mockResolvedValue({ totalObjects: 1, unavailableObjects: 1, availableObjects: 0, byStatus: [{ key: "booked", label: "Booked", count: 1 }], byCategory: [] })
    forSaleMock.mockReset().mockResolvedValue({ everythingForSale: true, forSale: false, objects: [], categories: [], areaPlaces: [] })
    statusChangesMock.mockReset().mockResolvedValue({ items: [], nextPageStartsAfter: null })
    renderContextMock.mockReset().mockResolvedValue({ eventKey: "", publicKey: "", region: "" })
  })

  /**
   * Only the open tab talks to the backend. The summary loads on mount; the status-change log must stay unfetched
   * until its tab is opened, which is the whole point of per-tab endpoints — one tab must not pay for the others.
   */
  it("fetches only the active tab's report, and the next tab's only when opened", async () => {
    renderTabs()

    await waitFor(() => expect(summaryMock).toHaveBeenCalledTimes(1))
    expect(statusChangesMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("tab", { name: "Status changes" }))

    await waitFor(() => expect(statusChangesMock).toHaveBeenCalledTimes(1))
    expect(summaryMock).toHaveBeenCalledTimes(1)
  })

  /** The opened report renders its data — the change the backend returned reaches the screen. */
  it("shows the report data for the opened tab", async () => {
    statusChangesMock.mockResolvedValue({
      items: [
        {
          objectLabel: "A-7",
          status: "booked",
          quantity: 1,
          holdToken: "",
          orderId: "",
          origin: "",
          dateUtc: "2026-09-16T11:23:31.613Z",
        },
      ],
      nextPageStartsAfter: null,
    })

    renderTabs()

    await userEvent.click(screen.getByRole("tab", { name: "Status changes" }))

    expect(await screen.findByText("A-7")).toBeInTheDocument()
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { system } from "@/theme"
import { EventReportTabs } from "./EventReportTabs"

const {
  summaryMock,
  forSaleMock,
  tablesMock,
  channelsMock,
  categoriesMock,
  statusChangesMock,
  renderContextMock,
} = vi.hoisted(() => ({
  summaryMock: vi.fn(),
  forSaleMock: vi.fn(),
  tablesMock: vi.fn(),
  channelsMock: vi.fn(),
  categoriesMock: vi.fn(),
  statusChangesMock: vi.fn(),
  renderContextMock: vi.fn(),
}))

vi.mock("@/api/seatsio", () => ({
  fetchSeatsIoEventSummary: summaryMock,
  fetchSeatsIoEventForSale: forSaleMock,
  fetchSeatsIoEventTables: tablesMock,
  fetchSeatsIoEventChannels: channelsMock,
  fetchSeatsIoEventCategories: categoriesMock,
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
    summaryMock.mockReset().mockResolvedValue({ totalObjects: 1, unavailableObjects: 1, byStatus: [{ key: "booked", label: "Booked", count: 1 }], byCategory: [] })
    channelsMock.mockReset().mockResolvedValue([{ key: "vip", name: "Vip", color: "#7551FF", objectCount: 2 }])
    forSaleMock.mockReset().mockResolvedValue({ everythingForSale: true, forSale: false, objects: [], categories: [], areaPlaces: [] })
    tablesMock.mockReset().mockResolvedValue({ mode: "INHERIT", modeLabel: "Inherited from chart", inheritsChartSettings: true, tables: [] })
    categoriesMock.mockReset().mockResolvedValue([])
    statusChangesMock.mockReset().mockResolvedValue({ items: [], nextPageStartsAfter: null })
    renderContextMock.mockReset().mockResolvedValue({ eventKey: "", publicKey: "", region: "" })
  })

  /**
   * Only the open tab talks to the backend. The summary loads on mount; the channels report must stay unfetched
   * until its tab is opened, which is the whole point of per-tab endpoints — one tab must not pay for the others.
   */
  it("fetches only the active tab's report, and the next tab's only when opened", async () => {
    renderTabs()

    await waitFor(() => expect(summaryMock).toHaveBeenCalledTimes(1))
    expect(channelsMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("tab", { name: "Channels" }))

    await waitFor(() => expect(channelsMock).toHaveBeenCalledTimes(1))
    expect(summaryMock).toHaveBeenCalledTimes(1)
  })

  /** The opened report renders its data — the channel group the backend returned reaches the screen. */
  it("shows the report data for the opened tab", async () => {
    renderTabs()

    await userEvent.click(screen.getByRole("tab", { name: "Channels" }))

    expect(await screen.findByText("Vip")).toBeInTheDocument()
  })
})

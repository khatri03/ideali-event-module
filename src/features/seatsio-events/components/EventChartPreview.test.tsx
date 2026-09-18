import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { EventChartPreview } from "./EventChartPreview"

const { renderContextMock, chartSpy } = vi.hoisted(() => ({
  renderContextMock: vi.fn(),
  chartSpy: vi.fn(),
}))

vi.mock("@/api/seatsio", () => ({
  fetchSeatsIoEventRenderContext: renderContextMock,
}))

vi.mock("@seatsio/seatsio-react", () => ({
  SeatsioSeatingChart: (props: Record<string, unknown>) => {
    chartSpy(props)
    return <div data-testid="seatsio-chart" />
  },
}))

const EVENT_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"

function renderPreview(progress?: { booked: number; total: number }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <EventChartPreview eventUniqueId={EVENT_UNIQUE_ID} progress={progress} />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("EventChartPreview", () => {
  beforeEach(() => {
    renderContextMock.mockReset()
    chartSpy.mockReset()
  })

  /**
   * The preview draws the live chart with the public workspace key the backend resolved, and only ever the public key.
   * A secret key reaching the browser here would leak the credential that must stay on the server, so the render
   * context carries none and the chart is handed the public key alone.
   */
  it("renders the chart with the public workspace key when the event is addressable", async () => {
    renderContextMock.mockResolvedValue({ eventKey: "event-1", publicKey: "pk-workspace", region: "na" })

    renderPreview()

    await waitFor(() => expect(screen.getByTestId("seatsio-chart")).toBeInTheDocument())
    const props = chartSpy.mock.calls[0]![0] as Record<string, unknown>
    expect(props.workspaceKey).toBe("pk-workspace")
    expect(props.event).toBe("event-1")
    expect(props.mode).toBe("static")
    expect(JSON.stringify(props)).not.toContain("sk-")
  })

  /**
   * The booked-vs-available split rides as a two-tone progress bar on top of the live map, so the organizer reads how
   * full the event is against the seat map itself. The bar is a real progressbar carrying the booked value out of the
   * total, and it shows only once the chart is drawable.
   */
  it("shows the booked-vs-available progress bar over the chart when a progress value is passed", async () => {
    renderContextMock.mockResolvedValue({ eventKey: "event-1", publicKey: "pk-workspace", region: "na" })

    renderPreview({ booked: 12, total: 40 })

    await waitFor(() => expect(screen.getByTestId("seatsio-chart")).toBeInTheDocument())
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "12")
    expect(bar).toHaveAttribute("aria-valuemax", "40")
    expect(screen.getByText("12 booked · 28 available")).toBeInTheDocument()
  })

  /**
   * An event with no public key has no map to draw, so the preview shows a plain message instead of the chart. The
   * status breakdown beside it still carries the numbers, so a missing map must never blank the whole summary.
   */
  it("shows a fallback and no chart when the event is not addressable", async () => {
    renderContextMock.mockResolvedValue({ eventKey: "", publicKey: "", region: "" })

    renderPreview()

    await waitFor(() =>
      expect(screen.getByText("A live seat map is not available for this event yet.")).toBeInTheDocument(),
    )
    expect(screen.queryByTestId("seatsio-chart")).not.toBeInTheDocument()
  })
})

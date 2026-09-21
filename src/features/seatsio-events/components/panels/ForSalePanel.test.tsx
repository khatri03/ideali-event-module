import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { ForSalePanel } from "./ForSalePanel"
import type { SeatsIoEventForSaleReport } from "@/api/seatsio"

const { renderContextMock, forSaleMock, markForSaleMock, markNotForSaleMock, clearSelectionMock, zoomToObjectsMock } =
  vi.hoisted(() => ({
    renderContextMock: vi.fn(),
    forSaleMock: vi.fn(),
    markForSaleMock: vi.fn(),
    markNotForSaleMock: vi.fn(),
    clearSelectionMock: vi.fn(),
    zoomToObjectsMock: vi.fn(),
  }))

vi.mock("@/api/seatsio", () => ({
  fetchSeatsIoEventRenderContext: renderContextMock,
  fetchSeatsIoEventForSale: forSaleMock,
  markSeatsIoEventForSale: markForSaleMock,
  markSeatsIoEventNotForSale: markNotForSaleMock,
}))

vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

interface ChartProps {
  onRenderStarted?: (chart: { clearSelection: () => void; zoomToObjects: (labels: string[]) => Promise<void> }) => void
  onObjectSelected?: (object: { label: string; forSale: boolean }) => void
  onObjectDeselected?: (object: { label: string; forSale: boolean }) => void
}

vi.mock("@seatsio/seatsio-react", () => ({
  SeatsioSeatingChart: (props: ChartProps) => (
    <div>
      <button
        type="button"
        onClick={() =>
          props.onRenderStarted?.({
            clearSelection: clearSelectionMock,
            zoomToObjects: zoomToObjectsMock.mockResolvedValue(undefined),
          })
        }
      >
        mount-chart
      </button>
      <button type="button" onClick={() => props.onObjectSelected?.({ label: "A-1", forSale: true })}>
        pick-on-sale
      </button>
      <button type="button" onClick={() => props.onObjectSelected?.({ label: "H-1", forSale: false })}>
        pick-not-for-sale
      </button>
    </div>
  ),
}))

const EVENT_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <ForSalePanel eventUniqueId={EVENT_UNIQUE_ID} formatCount={(value) => String(value)} />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

function forSaleReport(overrides: Partial<SeatsIoEventForSaleReport>): SeatsIoEventForSaleReport {
  return {
    everythingForSale: false,
    forSale: false,
    objects: [],
    categories: [],
    areaPlaces: [],
    ...overrides,
  }
}

describe("ForSalePanel", () => {
  beforeEach(() => {
    renderContextMock.mockReset().mockResolvedValue({ eventKey: "ek", publicKey: "pk", region: "eu" })
    forSaleMock.mockReset().mockResolvedValue(forSaleReport({ everythingForSale: true }))
    markForSaleMock.mockReset().mockResolvedValue(undefined)
    markNotForSaleMock.mockReset().mockResolvedValue(undefined)
    clearSelectionMock.mockReset()
    zoomToObjectsMock.mockReset()
  })

  /**
   * The take-off-sale card commits its own direction and only after its confirm dialog is accepted: staging a map
   * pick sends nothing until "Apply changes", because taking objects off sale is rate-limited and irreversible to a buyer.
   */
  it("takes staged map picks off sale from its own card after confirming", async () => {
    renderPanel()

    await screen.findByText("mount-chart")
    await userEvent.click(screen.getByText("mount-chart"))
    await userEvent.click(screen.getByText("pick-on-sale"))

    await userEvent.click(await screen.findByRole("button", { name: "Take 1 off sale" }))
    expect(markNotForSaleMock).not.toHaveBeenCalled()

    await userEvent.click(await screen.findByRole("button", { name: "Apply changes" }))

    await waitFor(() =>
      expect(markNotForSaleMock).toHaveBeenCalledWith(EVENT_UNIQUE_ID, { objects: ["A-1"], categories: [] }),
    )
    expect(clearSelectionMock).toHaveBeenCalled()
  })

  /** The held-back card stages the put-back direction and commits it on its own confirm, separate from take-off-sale. */
  it("puts a staged held-back object back on sale from its own card after confirming", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9"] }))
    renderPanel()

    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Put 1 back on sale" }))
    expect(markForSaleMock).not.toHaveBeenCalled()

    await userEvent.click(await screen.findByRole("button", { name: "Apply changes" }))

    await waitFor(() =>
      expect(markForSaleMock).toHaveBeenCalledWith(EVENT_UNIQUE_ID, { objects: ["Z-9"], categories: [] }),
    )
  })

  /** Each direction commits independently from its own card: applying one never sends the other's staged set. */
  it("applies each direction independently from its own card", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9"] }))
    renderPanel()

    await screen.findByText("mount-chart")
    await userEvent.click(screen.getByText("mount-chart"))
    await userEvent.click(screen.getByText("pick-on-sale"))
    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))

    await userEvent.click(await screen.findByRole("button", { name: "Take 1 off sale" }))
    await userEvent.click(await screen.findByRole("button", { name: "Apply changes" }))
    await waitFor(() =>
      expect(markNotForSaleMock).toHaveBeenCalledWith(EVENT_UNIQUE_ID, { objects: ["A-1"], categories: [] }),
    )
    expect(markForSaleMock).not.toHaveBeenCalled()

    await userEvent.click(await screen.findByRole("button", { name: "Put 1 back on sale" }))
    await userEvent.click(await screen.findByRole("button", { name: "Apply changes" }))
    await waitFor(() =>
      expect(markForSaleMock).toHaveBeenCalledWith(EVENT_UNIQUE_ID, { objects: ["Z-9"], categories: [] }),
    )
  })

  /** Cancelling a card's confirm dialog leaves its set staged and sends nothing, so a mis-click is safe. */
  it("does not apply when the confirm dialog is cancelled", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9"] }))
    renderPanel()

    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Put 1 back on sale" }))
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(markForSaleMock).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Put 1 back on sale" })).toBeInTheDocument()
  })

  /** Clearing a card drops its staged set locally and hides its apply button without sending anything to the backend. */
  it("clears a staged direction without committing", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9"] }))
    renderPanel()

    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Clear" }))

    expect(markForSaleMock).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("button", { name: "Put 1 back on sale" })).not.toBeInTheDocument())
  })

  /** The public renderer can only select on-sale objects, so a not-for-sale pick stages nothing and no apply button appears. */
  it("does not stage an object that is already not for sale", async () => {
    renderPanel()

    await screen.findByText("mount-chart")
    await userEvent.click(screen.getByText("pick-not-for-sale"))

    expect(screen.queryByRole("button", { name: /off sale/ })).not.toBeInTheDocument()
    expect(markNotForSaleMock).not.toHaveBeenCalled()
  })

  /** With no restriction set, the report shows the on-sale banner and neither card exposes an apply button. */
  it("shows the everything-on-sale banner and no apply buttons when nothing is staged", async () => {
    renderPanel()

    expect(await screen.findByText("Everything is on sale")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /off sale/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /back on sale/ })).not.toBeInTheDocument()
  })

  /** The "All" pill stages every held-back object at once, so one tap queues the whole set for putting back on sale. */
  it("selects every held-back object with the All pill and puts them back on sale", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9", "Z-10"] }))
    renderPanel()

    await userEvent.click(await screen.findByRole("button", { name: "All" }))
    await userEvent.click(await screen.findByRole("button", { name: "Put 2 back on sale" }))
    await userEvent.click(await screen.findByRole("button", { name: "Apply changes" }))

    await waitFor(() =>
      expect(markForSaleMock).toHaveBeenCalledWith(EVENT_UNIQUE_ID, { objects: ["Z-9", "Z-10"], categories: [] }),
    )
  })

  /** Tapping a held-back pill to stage it zooms the live map to that object, so the organizer sees where it sits. */
  it("zooms the map to a held-back object when its pill is tapped", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9"] }))
    renderPanel()

    await screen.findByText("mount-chart")
    await userEvent.click(screen.getByText("mount-chart"))
    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))

    expect(zoomToObjectsMock).toHaveBeenCalledWith(["Z-9"])
  })

  /** The zoom-to-selection toggle defaults on; switching it off stops staging a pill from zooming the map. */
  it("does not zoom when the zoom-to-selection toggle is off", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9"] }))
    renderPanel()

    await screen.findByText("mount-chart")
    await userEvent.click(screen.getByText("mount-chart"))
    await userEvent.click(await screen.findByText("Zoom to selection"))
    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))

    expect(zoomToObjectsMock).not.toHaveBeenCalled()
  })

  /** Unstaging a pill must not zoom: only selecting an object reveals it, so deselecting leaves the map put. */
  it("does not zoom when a staged pill is tapped again to unselect it", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9"] }))
    renderPanel()

    await screen.findByText("mount-chart")
    await userEvent.click(screen.getByText("mount-chart"))
    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))
    zoomToObjectsMock.mockClear()

    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))

    expect(zoomToObjectsMock).not.toHaveBeenCalled()
  })

  /** The "All" pill appears only when the report enumerates held-back objects, never for a whitelist or clean event. */
  it("does not render the All pill when no held-back objects are listed", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: true, objects: ["V-1"] }))
    renderPanel()

    await screen.findByText("Put objects back on sale")
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument()
  })
})

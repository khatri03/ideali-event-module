import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { ForSalePanel } from "./ForSalePanel"
import type { SeatsIoEventForSaleReport } from "@/api/seatsio"

const { renderContextMock, forSaleMock, markForSaleMock, markNotForSaleMock, clearSelectionMock } = vi.hoisted(() => ({
  renderContextMock: vi.fn(),
  forSaleMock: vi.fn(),
  markForSaleMock: vi.fn(),
  markNotForSaleMock: vi.fn(),
  clearSelectionMock: vi.fn(),
}))

vi.mock("@/api/seatsio", () => ({
  fetchSeatsIoEventRenderContext: renderContextMock,
  fetchSeatsIoEventForSale: forSaleMock,
  markSeatsIoEventForSale: markForSaleMock,
  markSeatsIoEventNotForSale: markNotForSaleMock,
}))

vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

interface ChartProps {
  onRenderStarted?: (chart: { clearSelection: () => void }) => void
  onObjectSelected?: (object: { label: string; forSale: boolean }) => void
  onObjectDeselected?: (object: { label: string; forSale: boolean }) => void
}

vi.mock("@seatsio/seatsio-react", () => ({
  SeatsioSeatingChart: (props: ChartProps) => (
    <div>
      <button type="button" onClick={() => props.onRenderStarted?.({ clearSelection: clearSelectionMock })}>
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
  })

  /**
   * The take-off-sale direction is rate-limited, so nothing is sent while objects are picked: the staged objects are
   * committed as a single batched call, and the map selection is cleared once it succeeds.
   */
  it("stages picked on-sale objects and takes them off sale in one apply", async () => {
    renderPanel()

    await screen.findByText("mount-chart")
    await userEvent.click(screen.getByText("mount-chart"))
    await userEvent.click(screen.getByText("pick-on-sale"))

    expect(markNotForSaleMock).not.toHaveBeenCalled()

    await userEvent.click(await screen.findByRole("button", { name: "Take off sale" }))

    await waitFor(() =>
      expect(markNotForSaleMock).toHaveBeenCalledWith(EVENT_UNIQUE_ID, { objects: ["A-1"], categories: [] }),
    )
    expect(clearSelectionMock).toHaveBeenCalled()
  })

  /**
   * The public renderer can only select on-sale objects, so a not-for-sale pick must never stage a redundant
   * off-sale change — the guard that stops a meaningless call reaching the backend.
   */
  it("does not stage an object that is already not for sale", async () => {
    renderPanel()

    await screen.findByText("mount-chart")
    await userEvent.click(screen.getByText("pick-not-for-sale"))

    expect(screen.queryByRole("button", { name: "Take off sale" })).not.toBeInTheDocument()
    expect(markNotForSaleMock).not.toHaveBeenCalled()
  })

  /**
   * Put-back-on-sale commits from its own button, but only after the confirm dialog is accepted: an accidental CTA
   * click must not reach the backend, because reversing a put-back costs a rate-limited take-off-sale.
   */
  it("puts a selected held-back object back on sale after confirming", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9"] }))
    renderPanel()

    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Put 1 back on sale" }))

    expect(markForSaleMock).not.toHaveBeenCalled()

    await userEvent.click(await screen.findByRole("button", { name: "Put back on sale" }))

    await waitFor(() =>
      expect(markForSaleMock).toHaveBeenCalledWith(EVENT_UNIQUE_ID, { objects: ["Z-9"], categories: [] }),
    )
  })

  /** Cancelling the confirm dialog must leave the put-back uncommitted, so a mis-click never reaches the backend. */
  it("does not put back on sale when the confirm dialog is cancelled", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9"] }))
    renderPanel()

    await userEvent.click(await screen.findByRole("button", { name: /Z-9/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Put 1 back on sale" }))
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(markForSaleMock).not.toHaveBeenCalled()
  })

  /** With no restriction set, the report shows the on-sale banner and offers no take-off-sale action. */
  it("shows the everything-on-sale banner and no take-off-sale action when nothing is held back", async () => {
    renderPanel()

    expect(await screen.findByText("Everything is on sale")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Take off sale" })).not.toBeInTheDocument()
  })

  /** The "All" pill selects every held-back object at once, so one tap stages the whole set for putting back on sale. */
  it("selects every held-back object with the All pill and puts them back on sale", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: false, objects: ["Z-9", "Z-10"] }))
    renderPanel()

    await userEvent.click(await screen.findByRole("button", { name: "All" }))
    await userEvent.click(await screen.findByRole("button", { name: "Put 2 back on sale" }))
    await userEvent.click(await screen.findByRole("button", { name: "Put back on sale" }))

    await waitFor(() =>
      expect(markForSaleMock).toHaveBeenCalledWith(EVENT_UNIQUE_ID, { objects: ["Z-9", "Z-10"], categories: [] }),
    )
  })

  /** The "All" pill appears only when the report enumerates held-back objects, never for a whitelist or clean event. */
  it("does not render the All pill when no held-back objects are listed", async () => {
    forSaleMock.mockResolvedValue(forSaleReport({ forSale: true, objects: ["V-1"] }))
    renderPanel()

    await screen.findByText("Put objects back on sale")
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument()
  })
})

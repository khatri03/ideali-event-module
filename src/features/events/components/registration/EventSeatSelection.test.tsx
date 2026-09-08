import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { ServiceResponseError } from "@/api/serviceResponse"
import type { SeatPick } from "@/features/events/hooks/useSeatSelection"
import { EventSeatSelection } from "./EventSeatSelection"

const fetchEventSeating = vi.fn()
const fetchEventSessionSeating = vi.fn()

vi.mock("@/api/eventSeating", () => ({
  fetchEventSeating: (...args: unknown[]) => fetchEventSeating(...args),
  fetchEventSessionSeating: (...args: unknown[]) => fetchEventSessionSeating(...args),
  holdEventSeat: vi.fn(),
  releaseEventSeat: vi.fn(),
}))

/**
 * Stands in for the Seats.io renderer, which draws to a canvas served by the vendor. The seat map itself is the
 * vendor's to test; what matters here is that a seat picked on it is reported upward priced, and that everything
 * the buyer needs to read the chart is on screen around it.
 */
vi.mock("@seatsio/seatsio-react", () => ({
  SeatsioSeatingChart: ({
    onObjectSelected,
  }: {
    onObjectSelected: (object: { label: string; category?: { key: string } }) => void
  }) => (
    <button type="button" onClick={() => onObjectSelected({ label: "A-14", category: { key: "cat-stalls" } })}>
      Pick seat A-14
    </button>
  ),
}))

const PICKED_SEAT: SeatPick = {
  sessionUniqueId: "session-1",
  objectLabel: "A-12",
  categoryKey: "cat-stalls",
  ticketTypeUniqueId: "ticket-1",
  ticketTypeName: "Stalls",
  price: 40,
}

const SEATING_MAP = {
  sessionUniqueId: "session-1",
  seatsIoPublicKey: "public-key",
  region: "eu",
  seatsIoEventKey: "event-key",
  holdToken: "hold-token",
  holdTokenExpiresAtUtc: null,
  categories: [
    {
      categoryKey: "cat-stalls",
      categoryName: "Stalls",
      ticketTypeUniqueId: "ticket-1",
      ticketTypeName: "Stalls",
      price: 40,
      color: "#7551FF",
      showRemainingTickets: false,
      remainingSeats: null,
    },
  ],
  selectedSeats: [],
}

interface RenderOptions {
  cartUniqueId?: string | null
  seats?: SeatPick[]
  refusal?: string | null
}

/** Renders the panel with a fresh query client, so one test's answers never serve another's. */
function renderSelection({ cartUniqueId = "cart-1", seats = [], refusal = null }: RenderOptions = {}) {
  const onPickSeat = vi.fn()
  const onUnpickSeats = vi.fn()
  const onAdoptHeldSeats = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const tree = (currentSeats: SeatPick[]) => (
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <EventSeatSelection
          eventUniqueId="event-1"
          cartUniqueId={cartUniqueId}
          sessionUniqueId="session-1"
          sessionName="Opening Night"
          seats={currentSeats}
          refusal={refusal}
          isSeatChanging={false}
          currencyCode="USD"
          accentColor="#7551FF"
          // Written as fresh closures, because that is what the registration form passes and what the adoption
          // effect has to survive.
          onPickSeat={(pick) => onPickSeat(pick)}
          onUnpickSeats={(objectLabels) => onUnpickSeats(objectLabels)}
          onAdoptHeldSeats={(heldSeats) => onAdoptHeldSeats(heldSeats)}
        />
      </QueryClientProvider>
    </ChakraProvider>
  )

  const view = render(tree(seats))

  return {
    onPickSeat,
    onUnpickSeats,
    onAdoptHeldSeats,
    /** Renders again the way the form does after any of its state moved, with handlers built anew. */
    rerenderWith: (nextSeats: SeatPick[]) => view.rerender(tree(nextSeats)),
  }
}

/** Opens the seat map the way a buyer does, since nothing on the chart is reachable until they ask for it. */
async function openSeatMap() {
  await userEvent.click(screen.getByRole("button", { name: /Pick seats|Change seats/ }))
}

beforeEach(() => {
  fetchEventSeating.mockReset().mockResolvedValue(SEATING_MAP)
  fetchEventSessionSeating.mockReset().mockResolvedValue({ ...SEATING_MAP, holdToken: "" })
})

describe("EventSeatSelection", () => {
  /**
   * The chart is the heaviest thing on the registration form and a form can carry several seated sessions. Drawing
   * one for a session the buyer never opens spends the vendor renderer on a map nobody is looking at.
   */
  it("draws no chart until the buyer asks for one", async () => {
    renderSelection()

    await waitFor(() => expect(fetchEventSeating).toHaveBeenCalled())

    expect(screen.queryByRole("button", { name: "Pick seat A-14" })).not.toBeInTheDocument()
  })

  /**
   * A seat travels as a label, and a label buys nothing on its own. The category it was drawn in is what says
   * which ticket type it is sold as and what it costs, so the order can account for it.
   */
  it("prices a picked seat from the category the chart drew it in", async () => {
    const { onPickSeat } = renderSelection()

    await openSeatMap()
    await userEvent.click(await screen.findByRole("button", { name: "Pick seat A-14" }))

    expect(onPickSeat).toHaveBeenCalledWith({
      sessionUniqueId: "session-1",
      objectLabel: "A-14",
      categoryKey: "cat-stalls",
      ticketTypeUniqueId: "ticket-1",
      ticketTypeName: "Stalls",
      price: 40,
    })
  })

  /**
   * The chart is read from the event before a cart exists, so seats can be chosen on the sessions step and only
   * paid for later. Waiting for a cart would leave the buyer looking at a message instead of a seating plan.
   */
  it("reads the seating plan from the event while there is no cart", async () => {
    renderSelection({ cartUniqueId: null })

    await openSeatMap()

    expect(await screen.findByRole("button", { name: "Pick seat A-14" })).toBeInTheDocument()
    expect(fetchEventSessionSeating).toHaveBeenCalledWith("event-1", "session-1")
    expect(fetchEventSeating).not.toHaveBeenCalled()
  })

  /**
   * A chart colours its seats by category and says nothing about what a colour costs. Without the legend beside it
   * the buyer is choosing between prices they cannot see.
   */
  it("prices the chart's colours beside the map", async () => {
    renderSelection()

    await openSeatMap()

    expect(await screen.findByRole("region", { name: "Seat categories" })).toBeVisible()
  })

  /**
   * A seat map that failed to load has to say so and say why. An empty frame is indistinguishable from a session
   * that simply has no seats left.
   */
  it("says why the map is missing rather than leaving an empty frame", async () => {
    fetchEventSeating.mockRejectedValue(new ServiceResponseError("Seat selection is unavailable right now."))

    renderSelection()

    await openSeatMap()

    expect(await screen.findByText("Seat selection is unavailable right now.")).toBeInTheDocument()
  })

  /**
   * Closing the map must not hide what the buyer is paying for. A seat that only exists inside a dismissed dialog
   * is a charge appearing on the total with nothing on the page accounting for it.
   */
  it("lists the seats picked while the map is shut", async () => {
    renderSelection({ seats: [PICKED_SEAT] })

    expect(await screen.findByText("Seat 12")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Change seats · 1 picked" })).toBeInTheDocument()
  })

  /**
   * The map is read once and kept, so it still lists a seat the buyer has just given up. Adopting it again off that
   * stale answer puts the seat straight back on the basket, and the buyer presses remove and watches it reappear.
   */
  it("does not put a given-up seat back when the form renders again", async () => {
    fetchEventSeating.mockResolvedValue({
      ...SEATING_MAP,
      selectedSeats: [
        {
          objectLabel: "A-12",
          categoryKey: "cat-stalls",
          ticketTypeUniqueId: "ticket-1",
          ticketTypeName: "Stalls",
          price: 40,
        },
      ],
    })

    const { onAdoptHeldSeats, rerenderWith } = renderSelection({ seats: [] })

    await waitFor(() => expect(onAdoptHeldSeats).toHaveBeenCalledTimes(1))

    rerenderWith([])

    expect(onAdoptHeldSeats).toHaveBeenCalledTimes(1)
  })

  /**
   * Giving up a seat is the correction a buyer makes most often. Making them reopen the whole map to undo one
   * mistaken pick turns a one-press fix into a hunt across a chart.
   */
  it("gives up a seat from the card without reopening the map", async () => {
    const { onUnpickSeats } = renderSelection({ seats: [PICKED_SEAT] })

    await userEvent.click(await screen.findByRole("button", { name: "Remove Seat 12 at Row A" }))
    await userEvent.click(await screen.findByRole("button", { name: "Remove" }))

    expect(onUnpickSeats).toHaveBeenCalledWith(["A-12"])
  })

  /**
   * Losing a seat to another buyer is the ordinary outcome of a busy sale. A buyer who is not told simply picks the
   * same seat again, and blames the screen when nothing happens.
   */
  it("tells the buyer in plain words when a seat was refused", async () => {
    renderSelection({ seats: [], refusal: "That seat has just been taken. Please pick another." })

    expect(await screen.findByRole("alert")).toHaveTextContent("That seat has just been taken. Please pick another.")
  })

  /**
   * A cart outlives the page it was built on. The seats it is already holding arrive with the map and nowhere else,
   * so a buyer who refreshed would otherwise see an empty card over seats they are still being charged for.
   */
  it("takes over the seats the cart is already holding", async () => {
    fetchEventSeating.mockResolvedValue({
      ...SEATING_MAP,
      selectedSeats: [
        {
          objectLabel: "A-12",
          categoryKey: "cat-stalls",
          ticketTypeUniqueId: "ticket-1",
          ticketTypeName: "Stalls",
          price: 40,
        },
      ],
    })

    const { onAdoptHeldSeats } = renderSelection()

    await waitFor(() => expect(onAdoptHeldSeats).toHaveBeenCalledWith([PICKED_SEAT]))
  })

  /**
   * The hold token the chart picks seats against expires, and the map is deliberately never refetched under a
   * buyer mid-pick. Opening is the one safe moment to renew it; without that, a form left open past the expiry
   * refuses every seat with nothing on screen to explain why.
   */
  it("re-reads the map as it opens, so seats are never picked against an expired hold token", async () => {
    renderSelection()

    await waitFor(() => expect(fetchEventSeating).toHaveBeenCalledTimes(1))

    await openSeatMap()

    await waitFor(() => expect(fetchEventSeating).toHaveBeenCalledTimes(2))
  })
})

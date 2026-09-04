import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { ServiceResponseError } from "@/api/serviceResponse"
import { EventSeatSelection } from "./EventSeatSelection"

const fetchEventSeating = vi.fn()
const holdEventSeat = vi.fn()
const releaseEventSeat = vi.fn()

vi.mock("@/api/eventSeating", () => ({
  fetchEventSeating: (...args: unknown[]) => fetchEventSeating(...args),
  holdEventSeat: (...args: unknown[]) => holdEventSeat(...args),
  releaseEventSeat: (...args: unknown[]) => releaseEventSeat(...args),
}))

/**
 * Stands in for the Seats.io renderer, which draws to a canvas served by the vendor. The seat map itself is the
 * vendor's to test; what matters here is that a seat picked on it reaches the server, and that a refusal reaches
 * the buyer.
 */
vi.mock("@seatsio/seatsio-react", () => ({
  SeatsioSeatingChart: ({ onObjectSelected }: { onObjectSelected: (object: { label: string }) => void }) => (
    <button type="button" onClick={() => onObjectSelected({ label: "A-14" })}>
      Pick seat A-14
    </button>
  ),
}))

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
    },
  ],
  selectedSeats: [],
}

const CART = {
  cartUniqueId: "cart-1",
  invoiceNo: "",
  eventUniqueId: "event-1",
  expiresAtUtc: null,
  subTotal: 40,
  discountAmount: null,
  netSubtotal: 40,
  totalAmount: 40,
  lines: [],
}

/** Renders the panel with a fresh query client, so one test's answers never serve another's. */
function renderSelection(cartUniqueId: string | null = "cart-1") {
  const onCartChanged = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <EventSeatSelection
          cartUniqueId={cartUniqueId}
          sessionUniqueId="session-1"
          currencyCode="USD"
          onCartChanged={onCartChanged}
        />
      </QueryClientProvider>
    </ChakraProvider>,
  )

  return { onCartChanged }
}

beforeEach(() => {
  fetchEventSeating.mockReset().mockResolvedValue(SEATING_MAP)
  holdEventSeat.mockReset().mockResolvedValue(CART)
  releaseEventSeat.mockReset().mockResolvedValue(CART)
})

describe("EventSeatSelection", () => {
  /**
   * A seat is only the buyer's once the server has held it, so picking one on the chart has to reach the server
   * rather than only colour the map in.
   */
  it("asks the server to hold the seat the buyer picked", async () => {
    const { onCartChanged } = renderSelection()

    await userEvent.click(await screen.findByRole("button", { name: "Pick seat A-14" }))

    await waitFor(() =>
      expect(holdEventSeat).toHaveBeenCalledWith("cart-1", { sessionUniqueId: "session-1", objectLabel: "A-14" }),
    )
    await waitFor(() => expect(onCartChanged).toHaveBeenCalledWith(CART))
  })

  /**
   * Losing a seat to another buyer is the ordinary outcome of a busy sale. A buyer who is not told simply presses
   * the same seat again, and blames the screen when nothing happens.
   */
  it("tells the buyer in plain words when the seat has just gone", async () => {
    holdEventSeat.mockRejectedValue(new ServiceResponseError("That seat has just been taken. Please pick another."))

    renderSelection()

    await userEvent.click(await screen.findByRole("button", { name: "Pick seat A-14" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("That seat has just been taken. Please pick another.")
  })

  /**
   * A seat is held in the buyer's name, which there is no way to do before they have given one. Drawing the chart
   * anyway would let them pick seats that nothing is holding.
   */
  it("asks for the buyer's details before drawing a chart it cannot hold seats on", () => {
    renderSelection(null)

    expect(screen.getByText("Tell us who you are to start picking seats")).toBeInTheDocument()
    expect(fetchEventSeating).not.toHaveBeenCalled()
  })

  /**
   * A seat map that failed to load has to say so and say why. An empty frame is indistinguishable from a session
   * that simply has no seats left.
   */
  it("says why the map is missing rather than leaving an empty frame", async () => {
    fetchEventSeating.mockRejectedValue(new ServiceResponseError("Seat selection is unavailable right now."))

    renderSelection()

    expect(await screen.findByText("Seat selection is unavailable right now.")).toBeInTheDocument()
  })
})

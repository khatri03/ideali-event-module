import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { ServiceResponseError } from "@/api/serviceResponse"
import type { EventCart } from "@/features/events/schemas/eventCart.schemas"
import { useSeatSelection, type SeatPick } from "./useSeatSelection"

const holdEventSeat = vi.fn()
const releaseEventSeat = vi.fn()

vi.mock("@/api/eventSeating", () => ({
  holdEventSeat: (...args: unknown[]) => holdEventSeat(...args),
  releaseEventSeat: (...args: unknown[]) => releaseEventSeat(...args),
}))

const CART = { cartUniqueId: "cart-1", lines: [] } as unknown as EventCart

/** One seat of a two-seat category, so a second pick can be added without repeating the whole shape. */
function seatPick(objectLabel: string, overrides: Partial<SeatPick> = {}): SeatPick {
  return {
    sessionUniqueId: "session-1",
    objectLabel,
    categoryKey: "cat-stalls",
    ticketTypeUniqueId: "ticket-1",
    ticketTypeName: "Stalls",
    price: 40,
    ...overrides,
  }
}

/** Renders the selection against a cart that may or may not exist yet, which is what every rule here turns on. */
function renderSeatSelection(cartUniqueId: string | null) {
  const ensureCart = vi.fn().mockResolvedValue(CART)
  const onCartChanged = vi.fn()

  const view = renderHook(() => useSeatSelection({ cartUniqueId, ensureCart, onCartChanged }))

  return { ...view, ensureCart, onCartChanged }
}

beforeEach(() => {
  holdEventSeat.mockReset().mockResolvedValue(CART)
  releaseEventSeat.mockReset().mockResolvedValue(CART)
})

describe("useSeatSelection", () => {
  /**
   * Seats are chosen a whole step before the buyer gives the name a cart needs. Refusing the pick until then would
   * make the buyer identify themselves before finding out what they are choosing between.
   */
  it("keeps a seat picked before there is a cart to hold it in", () => {
    const { result } = renderSeatSelection(null)

    act(() => result.current.pickSeat(seatPick("A-14")))

    expect(result.current.seatsBySession["session-1"]).toHaveLength(1)
    expect(holdEventSeat).not.toHaveBeenCalled()
  })

  /**
   * A seat nothing is holding is the buyer's intention, not their property. Once the cart opens every one of them
   * has to be claimed, or the buyer pays for seats the server never took off sale.
   */
  it("claims every seat picked beforehand once the cart opens", async () => {
    const { result, ensureCart } = renderSeatSelection(null)

    act(() => result.current.pickSeat(seatPick("A-14")))
    act(() => result.current.pickSeat(seatPick("A-15")))

    await act(() => result.current.claimPendingSeats())

    expect(ensureCart).toHaveBeenCalledTimes(1)
    expect(holdEventSeat).toHaveBeenCalledTimes(2)
    expect(holdEventSeat).toHaveBeenCalledWith("cart-1", { sessionUniqueId: "session-1", objectLabel: "A-15" })
  })

  /**
   * An order made only of seats never adds a ticket line, so nothing else would ever open its cart. Without this
   * the buyer reaches the payment step with a selection the server has never heard of.
   */
  it("opens a cart for an order that is nothing but seats", async () => {
    const { result, ensureCart } = renderSeatSelection(null)

    act(() => result.current.pickSeat(seatPick("A-14")))
    await act(() => result.current.claimPendingSeats())

    expect(ensureCart).toHaveBeenCalled()
  })

  /**
   * Between picking a seat and claiming it, somebody else can buy it. Carrying the seat on regardless would show a
   * buyer a seat on their order that the checkout is about to refuse.
   */
  it("drops a seat somebody else took first and says so", async () => {
    holdEventSeat.mockRejectedValue(new ServiceResponseError("That seat has just been taken. Please pick another."))

    const { result } = renderSeatSelection(null)

    act(() => result.current.pickSeat(seatPick("A-14")))
    await act(() => result.current.claimPendingSeats())

    expect(result.current.seatsBySession["session-1"]).toBeUndefined()
    expect(result.current.refusalBySession["session-1"]).toBe("That seat has just been taken. Please pick another.")
  })

  /**
   * With a cart already open there is nothing to wait for: a seat left unheld while the buyer carries on filling in
   * the form is a seat another buyer can still take.
   */
  it("claims a seat straight away once a cart exists", async () => {
    const { result, onCartChanged } = renderSeatSelection("cart-1")

    act(() => result.current.pickSeat(seatPick("A-14")))

    await waitFor(() =>
      expect(holdEventSeat).toHaveBeenCalledWith("cart-1", { sessionUniqueId: "session-1", objectLabel: "A-14" }),
    )
    await waitFor(() => expect(onCartChanged).toHaveBeenCalledWith(CART))
  })

  /**
   * A seat the server never took cannot be given back to it. Asking anyway answers with a refusal the buyer has no
   * way to act on, over a seat they have already dropped.
   */
  it("gives up an unclaimed seat without troubling the server", () => {
    const { result } = renderSeatSelection(null)

    act(() => result.current.pickSeat(seatPick("A-14")))
    act(() => result.current.unpickSeats("session-1", ["A-14"]))

    expect(result.current.seatsBySession["session-1"]).toBeUndefined()
    expect(releaseEventSeat).not.toHaveBeenCalled()
  })

  /**
   * A table given up is several held seats going back at once, and each answer carries the whole basket. Two
   * releases in flight would let the older answer overwrite the newer, leaving the buyer looking at a seat the
   * server no longer holds.
   */
  it("releases a table's seats one after another rather than together", async () => {
    let inFlight = 0
    let sawOverlap = false

    releaseEventSeat.mockImplementation(async () => {
      inFlight += 1
      sawOverlap = sawOverlap || inFlight > 1
      await Promise.resolve()
      inFlight -= 1

      return CART
    })

    const { result } = renderSeatSelection("cart-1")

    act(() => result.current.pickSeat(seatPick("19-2")))
    act(() => result.current.pickSeat(seatPick("19-3")))
    await waitFor(() => expect(holdEventSeat).toHaveBeenCalledTimes(2))

    act(() => result.current.unpickSeats("session-1", ["19-2", "19-3"]))

    await waitFor(() => expect(releaseEventSeat).toHaveBeenCalledTimes(2))
    expect(sawOverlap).toBe(false)
    expect(result.current.seatsBySession["session-1"]).toBeUndefined()
  })

  /**
   * A release the server refused leaves the seat held in the buyer's name. Removing it from the list anyway would
   * hide a seat they are still being charged for.
   */
  it("puts a seat back when the server refuses to release it", async () => {
    releaseEventSeat.mockRejectedValue(new ServiceResponseError("That seat could not be released."))

    const { result } = renderSeatSelection("cart-1")

    act(() => result.current.pickSeat(seatPick("A-14")))
    await waitFor(() => expect(holdEventSeat).toHaveBeenCalled())

    act(() => result.current.unpickSeats("session-1", ["A-14"]))

    await waitFor(() => expect(result.current.seatsBySession["session-1"]).toHaveLength(1))
    expect(result.current.refusalBySession["session-1"]).toBe("That seat could not be released.")
  })

  /**
   * Seats are sold as ticket types, and the rest of the form counts tickets. Without this count a seated session
   * contributes nothing to the visible tabs, the order summary or the attendee slots.
   */
  it("counts picked seats as tickets of their category's type", () => {
    const { result } = renderSeatSelection(null)

    act(() => result.current.pickSeat(seatPick("A-15")))
    act(() => result.current.pickSeat(seatPick("A-14")))

    expect(result.current.seatQuantitiesByTicketType["ticket-1"]).toBe(2)
  })

  /**
   * The server lists a reservation's seats in label order, and the attendee typed against the second slot has to be
   * the person sitting in the second seat. Pick order would name the wrong attendee on the ticket.
   */
  it("orders seat labels the way the server orders the reservation", () => {
    const { result } = renderSeatSelection(null)

    act(() => result.current.pickSeat(seatPick("A-15")))
    act(() => result.current.pickSeat(seatPick("A-14")))

    expect(result.current.seatLabelsByTicketType["ticket-1"]).toEqual(["A-14", "A-15"])
  })
})

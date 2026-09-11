import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { ServiceResponseError } from "@/api/serviceResponse"
import type { EventCart, EventCartLine } from "@/features/events/schemas/eventCart.schemas"
import { useSeatSelection, type SeatPick } from "./useSeatSelection"

const holdEventSeat = vi.fn()
const releaseEventSeat = vi.fn()
const issueSessionHoldToken = vi.fn()
const releaseSessionSeats = vi.fn()

vi.mock("@/api/eventSeating", () => ({
  holdEventSeat: (...args: unknown[]) => holdEventSeat(...args),
  releaseEventSeat: (...args: unknown[]) => releaseEventSeat(...args),
  issueSessionHoldToken: (...args: unknown[]) => issueSessionHoldToken(...args),
  releaseSessionSeats: (...args: unknown[]) => releaseSessionSeats(...args),
}))

const readStoredHoldToken = vi.fn()
const storeHoldToken = vi.fn()

vi.mock("@/features/events/utils/seatHoldTokenCookie", () => ({
  readStoredHoldToken: () => readStoredHoldToken(),
  storeHoldToken: (...args: unknown[]) => storeHoldToken(...args),
}))

const CART = { cartUniqueId: "cart-1", lines: [] } as unknown as EventCart

/** One seat as a restored cart line lists it, which carries the object's kind alongside its label. */
function cartSeat(objectLabel: string, objectType = "seat") {
  return { objectLabel, objectType }
}

/** One seat of a two-seat category, so a second pick can be added without repeating the whole shape. */
function seatPick(objectLabel: string, overrides: Partial<SeatPick> = {}): SeatPick {
  return {
    sessionUniqueId: "session-1",
    objectLabel,
    objectType: "seat",
    ticketTypeUniqueId: "ticket-1",
    ticketTypeName: "Stalls",
    price: 40,
    ...overrides,
  }
}

/** A cart as it comes back after a refresh, carrying one line per ticket type with the seats it holds. */
function restoredCart(lines: Partial<EventCartLine>[]): EventCart {
  return {
    cartUniqueId: "cart-1",
    lines: lines.map((line) => ({
      lineUniqueId: "line-1",
      sessionUniqueId: "session-1",
      ticketTypeUniqueId: "ticket-1",
      ticketTypeName: "Stalls",
      quantity: line.seats?.length ?? 1,
      unitPrice: 40,
      lineTotal: 40,
      discountAmount: null,
      reservationStatus: "Active" as const,
      seats: [],
      ...line,
    })),
  } as unknown as EventCart
}

/** Renders the selection against a cart that may or may not exist yet, which is what every rule here turns on. */
function renderSeatSelection(cartUniqueId: string | null) {
  const ensureCart = vi.fn().mockResolvedValue(CART)
  const onCartChanged = vi.fn()

  const view = renderHook(() =>
    useSeatSelection({ eventUniqueId: "event-1", cartUniqueId, ensureCart, onCartChanged }),
  )

  return { ...view, ensureCart, onCartChanged }
}

beforeEach(() => {
  holdEventSeat.mockReset().mockResolvedValue(CART)
  releaseEventSeat.mockReset().mockResolvedValue(CART)
  issueSessionHoldToken.mockReset().mockResolvedValue({ holdToken: "browser-token", expiresAtUtc: null })
  releaseSessionSeats.mockReset().mockResolvedValue(undefined)
  readStoredHoldToken.mockReset().mockReturnValue(null)
  storeHoldToken.mockReset()
})

describe("useSeatSelection", () => {
  /**
   * The token restored from the cookie is what this browser's seats are held under at Seats.io, so the cart has to
   * be offered it when it reads the map. Offering nothing lets the cart mint a second token, and the seats held
   * under the first can then be neither released nor paid for.
   */
  it("offers the token restored from the cookie for the cart to adopt", () => {
    readStoredHoldToken.mockReturnValue("token-from-cookie")

    const { result } = renderSeatSelection("cart-1")

    expect(result.current.presentedHoldToken).toBe("token-from-cookie")
  })

  /**
   * Once a token has been issued and checked it replaces whatever the cookie held: the checked one is the token the
   * chart is drawing under, and the cart must read the map under that same one.
   */
  it("offers the issued token once one has been obtained", async () => {
    readStoredHoldToken.mockReturnValue("token-from-cookie")

    const { result } = renderSeatSelection(null)

    await act(async () => {
      await result.current.ensureHoldToken("session-1")
    })

    expect(result.current.presentedHoldToken).toBe("browser-token")
  })

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
   * A seat the server never took cannot be given back to it. Without a hold token nothing anywhere is holding the
   * seat, so asking would answer with a refusal the buyer has no way to act on, over a seat they already dropped.
   */
  it("gives up a seat nothing is holding without troubling the server", () => {
    const { result } = renderSeatSelection(null)

    act(() => result.current.pickSeat(seatPick("A-14")))
    act(() => result.current.unpickSeats("session-1", ["A-14"]))

    expect(result.current.seatsBySession["session-1"]).toBeUndefined()
    expect(releaseEventSeat).not.toHaveBeenCalled()
    expect(releaseSessionSeats).not.toHaveBeenCalled()
  })

  /**
   * The chart holds every seat picked on it under the browser's token, and selects those seats again the next time
   * it is drawn under the same token. A seat dropped from the basket while the map is closed must therefore be
   * handed back to Seats.io, or it reappears picked the moment the buyer reopens the chart.
   */
  it("hands a seat held under the browser's own token back to Seats.io", async () => {
    const { result } = renderSeatSelection(null)

    await act(async () => {
      await result.current.ensureHoldToken("session-1")
    })
    act(() => result.current.pickSeat(seatPick("A-14")))
    act(() => result.current.unpickSeats("session-1", ["A-14"]))

    await waitFor(() =>
      expect(releaseSessionSeats).toHaveBeenCalledWith("event-1", "session-1", {
        holdToken: "browser-token",
        objectLabels: ["A-14"],
      }),
    )
    expect(releaseEventSeat).not.toHaveBeenCalled()
  })

  /**
   * A whole table goes back in one call, because no basket comes back to be overwritten before a cart exists.
   */
  it("hands a whole table back in a single call before the cart exists", async () => {
    const { result } = renderSeatSelection(null)

    await act(async () => {
      await result.current.ensureHoldToken("session-1")
    })
    act(() => {
      result.current.pickSeat(seatPick("19-2"))
      result.current.pickSeat(seatPick("19-3"))
    })
    act(() => result.current.unpickSeats("session-1", ["19-2", "19-3"]))

    await waitFor(() => expect(releaseSessionSeats).toHaveBeenCalledOnce())
    expect(releaseSessionSeats).toHaveBeenCalledWith("event-1", "session-1", {
      holdToken: "browser-token",
      objectLabels: ["19-2", "19-3"],
    })
  })

  /**
   * A seat Seats.io would not free is still held, and still drawn as picked on the next chart. Showing it gone from
   * the basket would leave the buyer unable to explain why the map keeps choosing it for them.
   */
  it("puts a seat back when Seats.io refuses to free it before the cart exists", async () => {
    releaseSessionSeats.mockRejectedValue(new ServiceResponseError("That seat could not be given up."))
    const { result } = renderSeatSelection(null)

    await act(async () => {
      await result.current.ensureHoldToken("session-1")
    })
    act(() => result.current.pickSeat(seatPick("A-14")))
    act(() => result.current.unpickSeats("session-1", ["A-14"]))

    await waitFor(() => expect(result.current.seatsBySession["session-1"]).toHaveLength(1))
    expect(result.current.refusalBySession["session-1"]).toBe("That seat could not be given up.")
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

    expect(result.current.seatsByTicketType["ticket-1"]).toEqual([
      { objectLabel: "A-14", objectType: "seat" },
      { objectLabel: "A-15", objectType: "seat" },
    ])
  })
  /**
   * A buyer who empties their whole registration has walked away from the cart, so there is nothing left to release
   * seats against. The basket has to come back empty all the same, or the summary keeps listing seats over an order
   * that no longer exists.
   */
  it("empties the basket when the whole registration is given up", () => {
    const { result } = renderSeatSelection("cart-1")

    act(() => result.current.pickSeat(seatPick("A-14")))
    act(() => result.current.forgetSeats())

    expect(result.current.seatsBySession).toEqual({})
    expect(result.current.seatQuantitiesByTicketType).toEqual({})
  })

  /**
   * A refresh empties this browser's memory of what was picked, but not the cart, which is what actually holds the
   * seats. Rebuilding the basket from its lines is the only thing standing between the buyer and an empty card over
   * seats they are still being charged for.
   */
  it("takes over the seats a restored cart is holding", () => {
    const { result } = renderSeatSelection("cart-1")

    act(() => result.current.adoptCartSeats(restoredCart([{ seats: [cartSeat("A-14"), cartSeat("A-15")] }])))

    expect(result.current.seatsBySession["session-1"]).toEqual([
      seatPick("A-14"),
      seatPick("A-15"),
    ])
    expect(holdEventSeat).not.toHaveBeenCalled()
  })

  /**
   * A restored seat is already held server-side. Treating it as a fresh pick would ask Seats.io to hold a seat this
   * very cart is holding, and giving it up again would then release nothing.
   */
  it("gives a restored seat back to the server rather than only forgetting it", async () => {
    const { result } = renderSeatSelection("cart-1")

    act(() => result.current.adoptCartSeats(restoredCart([{ seats: [cartSeat("A-14")] }])))
    act(() => result.current.unpickSeats("session-1", ["A-14"]))

    await waitFor(() =>
      expect(releaseEventSeat).toHaveBeenCalledWith("cart-1", { sessionUniqueId: "session-1", objectLabel: "A-14" }),
    )
  })

  /**
   * A general-admission line is a count, not a chair. Restoring one as a seat would put a label on the basket that
   * no chart draws and no attendee can be sat in.
   */
  it("restores no seats from a line that sells general admission", () => {
    const { result } = renderSeatSelection("cart-1")

    act(() => result.current.adoptCartSeats(restoredCart([{ seats: [], quantity: 3 }])))

    expect(result.current.seatsBySession["session-1"]).toBeUndefined()
  })
  /**
   * Seats.io issues a hold token per buyer, not per chart. Minting one for every session the buyer opens would
   * scatter their seats across tokens, and the cart could only ever take over the last of them.
   */
  it("issues one hold token for the whole form", async () => {
    const { result } = renderSeatSelection(null)

    await act(async () => {
      await result.current.ensureHoldToken("session-1")
      await result.current.ensureHoldToken("session-2")
    })

    expect(issueSessionHoldToken).toHaveBeenCalledOnce()
    expect(result.current.holdToken).toBe("browser-token")
  })

  /**
   * A seat picked before the cart existed is held under the browser's own token. Claiming it without offering that
   * token would have the cart mint another, and the seat would stay held by a token nothing can book it under.
   */
  it("offers the browser's token when claiming a seat against the cart", async () => {
    const { result } = renderSeatSelection("cart-1")

    await act(async () => {
      await result.current.ensureHoldToken("session-1")
    })
    act(() => result.current.pickSeat(seatPick("A-14")))

    await waitFor(() =>
      expect(holdEventSeat).toHaveBeenCalledWith("cart-1", {
        sessionUniqueId: "session-1",
        objectLabel: "A-14",
        holdToken: "browser-token",
      }),
    )
  })

  /**
   * A chart drawn without a token looks exactly like one that works. The buyer would find out only at the first
   * seat they picked, having been told nothing, so the failure is said out loud instead.
   */
  it("says so when no hold token could be issued", async () => {
    issueSessionHoldToken.mockRejectedValue(new ServiceResponseError("Seat selection is unavailable right now."))

    const { result } = renderSeatSelection(null)

    await act(async () => {
      expect(await result.current.ensureHoldToken("session-1")).toBeNull()
    })

    expect(result.current.refusalBySession["session-1"]).toBe("Seat selection is unavailable right now.")
  })
  /**
   * A reload empties the page's memory but not the vendor's. Asking for a second token would leave the seats picked
   * before the refresh held by one nobody has: the buyer cannot pay for them and nobody else can take them until
   * the first token lapses of its own accord.
   */
  it("presents the token it was already holding rather than asking for another", async () => {
    readStoredHoldToken.mockReturnValue("token-from-before-the-reload")

    const { result } = renderSeatSelection(null)

    await act(async () => {
      await result.current.ensureHoldToken("session-1")
    })

    expect(issueSessionHoldToken).toHaveBeenCalledWith("event-1", "session-1", "token-from-before-the-reload")
  })

  /**
   * The token is only worth presenting later if it outlives this page. Keeping it in memory alone is what made a
   * refresh strand the buyer's seats in the first place.
   */
  it("keeps the token the server answered with so the next page load can present it", async () => {
    issueSessionHoldToken.mockResolvedValue({ holdToken: "browser-token", expiresAtUtc: "2026-09-09T12:00:00" })

    const { result } = renderSeatSelection(null)

    await act(async () => {
      await result.current.ensureHoldToken("session-1")
    })

    expect(storeHoldToken).toHaveBeenCalledWith("browser-token", "2026-09-09T12:00:00")
  })

  /**
   * The browser's word that its token is live is worth nothing; only Seats.io knows. A stored token is therefore
   * presented for checking once, and the answer - the same token or a fresh one - is what the chart draws against.
   */
  it("draws against the token the server confirmed, not the one it presented", async () => {
    readStoredHoldToken.mockReturnValue("token-that-already-lapsed")
    issueSessionHoldToken.mockResolvedValue({ holdToken: "replacement-token", expiresAtUtc: null })

    const { result } = renderSeatSelection(null)

    await act(async () => {
      expect(await result.current.ensureHoldToken("session-1")).toBe("replacement-token")
    })

    expect(result.current.holdToken).toBe("replacement-token")
  })

  /**
   * Seats leave inventory the moment they are picked, a whole step before the cart that owns the purchase deadline
   * exists. Without the token's own deadline the form has nothing to count down to, and that first hold runs out in
   * silence with the buyer still looking at the chart.
   */
  it("says how long its token holds seats for, so the form can count down before a cart exists", async () => {
    issueSessionHoldToken.mockResolvedValue({ holdToken: "browser-token", expiresAtUtc: "2026-09-09T12:10:00" })

    const { result } = renderSeatSelection(null)

    await act(async () => {
      await result.current.ensureHoldToken("session-1")
    })

    expect(result.current.holdTokenExpiresAtUtc).toBe("2026-09-09T12:10:00")
  })
})

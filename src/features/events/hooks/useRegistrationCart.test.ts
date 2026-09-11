import { act, renderHook, waitFor } from "@testing-library/react"
import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useRegistrationCart } from "./useRegistrationCart"
import type { EventCart, EventCartPrice } from "@/features/events/schemas/eventCart.schemas"

const { createEventCartMock, priceEventCartMock, addEventCartLineMock, fetchEventCartMock } = vi.hoisted(() => ({
  createEventCartMock: vi.fn(),
  priceEventCartMock: vi.fn(),
  addEventCartLineMock: vi.fn(),
  fetchEventCartMock: vi.fn(),
}))

vi.mock("@/api/eventCheckout", () => ({
  createEventCart: createEventCartMock,
  priceEventCart: priceEventCartMock,
  addEventCartLine: addEventCartLineMock,
  removeEventCartLine: vi.fn(),
  fetchEventCart: fetchEventCartMock,
}))

const EVENT_UNIQUE_ID = "event-1"
const CART_UNIQUE_ID = "cart-1"

const CART = {
  cartUniqueId: CART_UNIQUE_ID,
  eventUniqueId: EVENT_UNIQUE_ID,
  expiresAtUtc: null,
  lines: [],
} as unknown as EventCart

const HELD_CART = { ...CART, expiresAtUtc: "2099-01-01T00:00:00Z" } as unknown as EventCart

const SEATED_CART = {
  cartUniqueId: CART_UNIQUE_ID,
  eventUniqueId: EVENT_UNIQUE_ID,
  expiresAtUtc: "2099-01-01T00:00:00Z",
  lines: [{ lineUniqueId: "line-1", ticketTypeUniqueId: "ticket-1", quantity: 1 }],
} as unknown as EventCart

const PRICE = {
  cartUniqueId: CART_UNIQUE_ID,
  subTotal: 210,
  discountAmount: 0,
  netSubtotal: 210,
  paymentBreakdowns: [],
} as EventCartPrice

function httpFailure(status: number, data: unknown) {
  return new AxiosError("failed", String(status), undefined, undefined, {
    status,
    data,
    statusText: "",
    headers: {},
    config: { headers: {} },
  } as never)
}

const CAPABILITY_REFUSAL = httpFailure(403, {
  Success: false,
  Message: "This registration session is no longer available. Start again from the event page.",
  ErrorCode: "cart_capability_required",
})

/** Opens the cart the way the form does: by making a selection. No buyer is stated - the cart is anonymous. */
async function openCartWithASelection(result: { current: ReturnType<typeof useRegistrationCart> }) {
  await act(async () => {
    await result.current.syncTicketSelection({
      sessionUniqueId: "session-1",
      ticketTypeUniqueId: "ticket-1",
      quantity: 1,
    })
  })
}

describe("useRegistrationCart", () => {
  beforeEach(() => {
    createEventCartMock.mockReset().mockResolvedValue(CART)
    addEventCartLineMock.mockReset().mockResolvedValue(CART)
    fetchEventCartMock.mockReset()
    priceEventCartMock.mockReset().mockResolvedValue(PRICE)
  })

  it("ApplyCoupon_ServerRejectsIt_LeavesNoCouponShowingAsApplied", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await openCartWithASelection(result)

    priceEventCartMock.mockRejectedValueOnce(new Error("This coupon has reached its usage limit."))

    await act(async () => {
      await result.current.applyCoupon("VIPOFFIFID")
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.appliedCouponCode).toBeNull()
  })

  it("ApplyCoupon_ServerRejectsIt_IsNotSentOnTheNextReprice", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await openCartWithASelection(result)

    priceEventCartMock.mockRejectedValueOnce(new Error("This coupon has reached its usage limit."))

    await act(async () => {
      await result.current.applyCoupon("VIPOFFIFID")
    })

    await act(async () => {
      await result.current.syncTicketSelection({
        sessionUniqueId: "session-1",
        ticketTypeUniqueId: "ticket-2",
        quantity: 1,
      })
    })

    // A rejected code left in place would fail every later quantity change, not just its own apply.
    const lastPricing = priceEventCartMock.mock.calls.at(-1)
    expect(lastPricing?.[1]).toEqual({ couponCode: null })
  })

  it("ApplyCoupon_ServerAcceptsIt_ShowsItAsApplied", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await openCartWithASelection(result)

    await act(async () => {
      await result.current.applyCoupon("VIPOFFIFID")
    })

    expect(result.current.appliedCouponCode).toBe("VIPOFFIFID")
    expect(priceEventCartMock.mock.calls.at(-1)?.[1]).toEqual({ couponCode: "VIPOFFIFID" })
  })

  /**
   * A seat added or dropped changes the basket the same way a quantity does, and the summary total is read from
   * the priced cart. Adopting the seat's cart without repricing leaves that total showing what the basket cost
   * before the seat - the live defect where a table added for CA$1,000 left the total at the general-admission
   * figure until an unrelated quantity change happened to re-price.
   */
  it("AdoptCartAndReprice_SeatChangedTheBasket_RefreshesThePricedTotal", async () => {
    priceEventCartMock.mockResolvedValue({ ...PRICE, subTotal: 1210, netSubtotal: 1210 })

    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))

    await act(async () => {
      result.current.adoptCartAndReprice(SEATED_CART)
    })

    await waitFor(() => expect(result.current.price?.netSubtotal).toBe(1210))
    expect(result.current.cart).toBe(SEATED_CART)
    expect(priceEventCartMock).toHaveBeenCalledWith(CART_UNIQUE_ID, { couponCode: null })
  })

  /**
   * The seat is already held at the server by the time its cart comes back, so a reprice that fails must not drop
   * it from the basket. The failure is surfaced the way a quantity change's reprice failure is, and the seat stays.
   */
  it("AdoptCartAndReprice_RepriceFails_KeepsTheSeatButReportsTheFailure", async () => {
    priceEventCartMock.mockReset().mockRejectedValue(new Error("Seat selection is unavailable right now."))

    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))

    await act(async () => {
      result.current.adoptCartAndReprice(SEATED_CART)
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.cart).toBe(SEATED_CART)
  })

  it("CompleteCart_PaymentWentThrough_RetiresTheHoldDeadline", async () => {
    createEventCartMock.mockResolvedValue(HELD_CART)
    addEventCartLineMock.mockResolvedValue(HELD_CART)

    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await openCartWithASelection(result)

    await waitFor(() => expect(result.current.expiresAtUtc).toBe("2099-01-01T00:00:00Z"))

    act(() => {
      result.current.completeCart()
    })

    // A paid order cannot expire, so the countdown chip and its expiry dialog both go away with it.
    expect(result.current.expiresAtUtc).toBeNull()
  })

  it("ApplyCoupon_RejectedAfterAnAcceptedOne_KeepsTheAcceptedCoupon", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await openCartWithASelection(result)

    await act(async () => {
      await result.current.applyCoupon("SAVE10")
    })

    priceEventCartMock.mockRejectedValueOnce(new Error("Invalid coupon code."))

    await act(async () => {
      await result.current.applyCoupon("NOPE")
    })

    // The pricing transaction rolled back, so the cart still carries what it had before.
    expect(result.current.appliedCouponCode).toBe("SAVE10")
  })

  it("ServerRefusesTheCapability_EndsTheSessionInsteadOfLeavingADeadCart", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await openCartWithASelection(result)

    priceEventCartMock.mockRejectedValueOnce(CAPABILITY_REFUSAL)

    await act(async () => {
      await result.current.applyCoupon("SAVE10")
    })

    await waitFor(() => expect(result.current.isSessionLost).toBe(true))
    // Holding the cart would leave the buyer retrying against one the server will never accept again.
    expect(result.current.cart).toBeNull()
    expect(result.current.price).toBeNull()
    expect(result.current.error).toBe(
      "This registration session is no longer available. Start again from the event page.",
    )
  })

  it("ServerRefusesTheCapability_OpensAFreshCartOnTheNextSelection", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await openCartWithASelection(result)

    priceEventCartMock.mockRejectedValueOnce(CAPABILITY_REFUSAL)

    await act(async () => {
      await result.current.applyCoupon("SAVE10")
    })

    const createCallsBefore = createEventCartMock.mock.calls.length

    await act(async () => {
      await result.current.syncTicketSelection({
        sessionUniqueId: "session-1",
        ticketTypeUniqueId: "ticket-1",
        quantity: 1,
      })
    })

    // The refused cart is gone, so the next selection has to open a new one rather than reuse its id.
    expect(createEventCartMock.mock.calls.length).toBe(createCallsBefore + 1)
  })

  it("SelectingATicket_BeforeAnyBuyerIsKnown_OpensAnAnonymousCart", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))

    await openCartWithASelection(result)

    // The cart opens on the selection alone, with no buyer - who the order is addressed to is stated at
    // checkout. Sending a buyer here is what forced a general-admission pick to wait for the buyer step and
    // vanish on any refresh taken before it.
    expect(createEventCartMock).toHaveBeenCalledExactlyOnceWith({ eventUniqueId: EVENT_UNIQUE_ID })
    expect(result.current.cart).not.toBeNull()
  })

  it("ServerFailsForAnyOtherReason_KeepsTheCartSoTheBuyerCanRetry", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await openCartWithASelection(result)

    priceEventCartMock.mockRejectedValueOnce(httpFailure(500, { Message: "Something broke." }))

    await act(async () => {
      await result.current.applyCoupon("SAVE10")
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.isSessionLost).toBe(false)
    expect(result.current.cart).not.toBeNull()
  })
})

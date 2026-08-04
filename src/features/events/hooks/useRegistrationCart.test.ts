import { act, renderHook, waitFor } from "@testing-library/react"
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

const PRICE = {
  cartUniqueId: CART_UNIQUE_ID,
  subTotal: 210,
  discountAmount: 0,
  netSubtotal: 210,
  paymentBreakdowns: [],
} as EventCartPrice

async function identify(result: { current: ReturnType<typeof useRegistrationCart> }) {
  await act(async () => {
    await result.current.setBuyerIdentity({ name: "Sohail Ahmed", email: "khatri03@gmail.com" })
  })

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
    await identify(result)

    priceEventCartMock.mockRejectedValueOnce(new Error("This coupon has reached its usage limit."))

    await act(async () => {
      await result.current.applyCoupon("VIPOFFIFID")
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.appliedCouponCode).toBeNull()
  })

  it("ApplyCoupon_ServerRejectsIt_IsNotSentOnTheNextReprice", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await identify(result)

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
    await identify(result)

    await act(async () => {
      await result.current.applyCoupon("VIPOFFIFID")
    })

    expect(result.current.appliedCouponCode).toBe("VIPOFFIFID")
    expect(priceEventCartMock.mock.calls.at(-1)?.[1]).toEqual({ couponCode: "VIPOFFIFID" })
  })

  it("CompleteCart_PaymentWentThrough_RetiresTheHoldDeadline", async () => {
    createEventCartMock.mockResolvedValue(HELD_CART)
    addEventCartLineMock.mockResolvedValue(HELD_CART)

    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await identify(result)

    await waitFor(() => expect(result.current.expiresAtUtc).toBe("2099-01-01T00:00:00Z"))

    act(() => {
      result.current.completeCart()
    })

    // A paid order cannot expire, so the countdown chip and its expiry dialog both go away with it.
    expect(result.current.expiresAtUtc).toBeNull()
  })

  it("ApplyCoupon_RejectedAfterAnAcceptedOne_KeepsTheAcceptedCoupon", async () => {
    const { result } = renderHook(() => useRegistrationCart(EVENT_UNIQUE_ID))
    await identify(result)

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
})

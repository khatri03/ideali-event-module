import { describe, expect, it } from "vitest"
import { normalizeEventCart } from "@/features/events/schemas/eventCart.schemas"

const OPEN_CART_PAYLOAD = {
  CartUniqueId: "5c1d8e2f-6b7a-4c39-9d80-1e2f3a4b5c6d",
  InvoiceNo: null,
  EventUniqueId: "8f2a1c44-3f0e-4b53-9a4a-7c0d1e5f22b1",
  ExpiresAtUtc: "2026-08-05T09:29:41Z",
  SubTotal: 249,
  DiscountAmount: null,
  NetSubtotal: 249,
  TotalAmount: 249,
  Lines: [
    {
      LineUniqueId: "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d",
      SessionUniqueId: "c9e0b1a2-77d4-4f6a-8b21-5a3e9c7f4d10",
      TicketTypeUniqueId: "2d7c4e19-9a11-42b8-b0d6-6f8c1e3a5b72",
      TicketTypeName: "General Admission",
      Quantity: 1,
      UnitPrice: 249,
      LineTotal: 249,
      DiscountAmount: null,
      ReservationStatus: "Active",
    },
  ],
}

describe("normalizeEventCart", () => {
  it("Normalize_CartBeforePaymentStarts_AcceptsANullOrderNumber", () => {
    const cart = normalizeEventCart(OPEN_CART_PAYLOAD)

    expect(cart.invoiceNo).toBe("")
    expect(cart.cartUniqueId).toBe("5c1d8e2f-6b7a-4c39-9d80-1e2f3a4b5c6d")
    expect(cart.totalAmount).toBe(249)
    expect(cart.lines).toHaveLength(1)
  })

  it("Normalize_CartAfterTheInvoiceIsRaised_KeepsTheOrderNumber", () => {
    const cart = normalizeEventCart({ ...OPEN_CART_PAYLOAD, InvoiceNo: "EV-2026-004183" })

    expect(cart.invoiceNo).toBe("EV-2026-004183")
  })

  it("Normalize_CamelCasePayload_MapsTheSameFields", () => {
    const cart = normalizeEventCart({
      cartUniqueId: "5c1d8e2f-6b7a-4c39-9d80-1e2f3a4b5c6d",
      invoiceNo: null,
      eventUniqueId: "8f2a1c44-3f0e-4b53-9a4a-7c0d1e5f22b1",
      expiresAtUtc: null,
      subTotal: 0,
      netSubtotal: 0,
      totalAmount: 0,
      lines: [],
    })

    expect(cart.invoiceNo).toBe("")
    expect(cart.expiresAtUtc).toBeNull()
    expect(cart.lines).toEqual([])
  })

  it("Normalize_PayloadMissingTheCartId_Throws", () => {
    expect(() => normalizeEventCart({ CartUniqueId: 42 })).toThrow()
  })
})

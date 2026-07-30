/**
 * The cookie is scoped to `/events`, so the document has to sit under that path to see it at all.
 * @vitest-environment-options { "url": "https://localhost:3000/events/E1/register" }
 */
import { addMinutes } from "date-fns"
import { afterEach, describe, expect, it } from "vitest"
import { clearStoredCartId, readStoredCartId, storeCartId } from "@/features/events/utils/registrationCartCookie"

afterEach(clearStoredCartId)

function toUtcString(date: Date) {
  return date.toISOString().replace("Z", "")
}

describe("registrationCartCookie", () => {
  it("Store_ThenRead_ReturnsTheCartId", () => {
    storeCartId("cart-123", toUtcString(addMinutes(new Date(), 15)))

    expect(readStoredCartId()).toBe("cart-123")
  })

  it("Read_NothingStored_ReturnsNull", () => {
    expect(readStoredCartId()).toBeNull()
  })

  it("Clear_AfterStoring_RemovesTheCartId", () => {
    storeCartId("cart-123", toUtcString(addMinutes(new Date(), 15)))
    clearStoredCartId()

    expect(readStoredCartId()).toBeNull()
  })

  it("Store_DeadlineWithinTheGracePeriod_StaysReadable", () => {
    // Expired two minutes ago, so the 30 minute reclaim grace has not run out yet.
    storeCartId("cart-123", toUtcString(addMinutes(new Date(), -2)))

    expect(readStoredCartId()).toBe("cart-123")
  })

  it("Store_DeadlinePastTheGracePeriod_ExpiresImmediately", () => {
    storeCartId("cart-123", toUtcString(addMinutes(new Date(), -31)))

    expect(readStoredCartId()).toBeNull()
  })

  it("Store_WithoutADeadline_KeepsASessionCookie", () => {
    storeCartId("cart-123", null)

    expect(readStoredCartId()).toBe("cart-123")
  })

  it("Store_ReplacingAnEarlierCart_KeepsOnlyTheLatestId", () => {
    storeCartId("cart-123", null)
    storeCartId("cart-456", null)

    expect(readStoredCartId()).toBe("cart-456")
  })
})

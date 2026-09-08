/**
 * The cookie is scoped to `/events`, so the document has to sit under that path to see it at all.
 * @vitest-environment-options { "url": "https://localhost:3000/events/E1/register" }
 */
import { addMinutes } from "date-fns"
import { afterEach, describe, expect, it } from "vitest"
import {
  clearStoredHoldToken,
  readStoredHoldToken,
  storeHoldToken,
} from "@/features/events/utils/seatHoldTokenCookie"

afterEach(clearStoredHoldToken)

function toUtcString(date: Date) {
  return date.toISOString().replace("Z", "")
}

describe("seatHoldTokenCookie", () => {
  /**
   * A reload must find the token the buyer was already holding seats under. Losing it strands those seats: the
   * buyer cannot buy them because the chart no longer holds them, and nobody else can have them either until the
   * old token lapses on its own.
   */
  it("Store_ThenRead_ReturnsTheHoldToken", () => {
    storeHoldToken("token-123", toUtcString(addMinutes(new Date(), 15)))

    expect(readStoredHoldToken()).toBe("token-123")
  })

  /**
   * A buyer who has never picked a seat holds nothing, and the chart must ask for a token rather than present an
   * invented one.
   */
  it("Read_NothingStored_ReturnsNull", () => {
    expect(readStoredHoldToken()).toBeNull()
  })

  /**
   * A token no longer worth presenting has to be forgettable, so the next chart asks for a fresh one instead of
   * offering a dead token for checking on every page load for the rest of the browser's life.
   */
  it("Clear_AfterStoring_RemovesTheHoldToken", () => {
    storeHoldToken("token-123", toUtcString(addMinutes(new Date(), 15)))
    clearStoredHoldToken()

    expect(readStoredHoldToken()).toBeNull()
  })

  /**
   * A token with no stated expiry is kept only for the tab that holds the seats. Persisting it would have a new tab
   * present a token whose seats had long since gone back on sale.
   */
  it("Store_WithoutAnExpiry_StillReadsBackWithinTheSession", () => {
    storeHoldToken("token-123", null)

    expect(readStoredHoldToken()).toBe("token-123")
  })
})

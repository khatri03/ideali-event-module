import { describe, expect, it } from "vitest"
import type { SelectableObject } from "@seatsio/seatsio-react"
import { popoverInfoFor } from "./popoverInfoFor"

/** Builds the smallest object the popover reader touches; only status and forSale drive its output. */
function bookableObject(fields: { status?: string; forSale?: boolean }): SelectableObject {
  return { status: "free", forSale: true, ...fields } as unknown as SelectableObject
}

describe("popoverInfoFor", () => {
  /** A sold seat must announce "Sold" on hover so the organizer sees why the object can't be staged. */
  it("labels a booked object Sold", () => {
    expect(popoverInfoFor(bookableObject({ status: "booked" }))).toBe("Sold")
  })

  /** An on-sale seat withheld from sale reads "Not for sale", distinct from a sold one. */
  it("labels a withheld on-sale object Not for sale", () => {
    expect(popoverInfoFor(bookableObject({ status: "free", forSale: false }))).toBe("Not for sale")
  })

  /** Sold takes priority: a booked object still reads "Sold" even when its forSale flag is off. */
  it("prefers Sold over Not for sale for a booked withheld object", () => {
    expect(popoverInfoFor(bookableObject({ status: "booked", forSale: false }))).toBe("Sold")
  })

  /** A free, on-sale object adds no extra line, leaving Seats.io's own popover untouched. */
  it("adds no line for a free on-sale object", () => {
    expect(popoverInfoFor(bookableObject({ status: "free", forSale: true }))).toBe("")
  })

  /** A section carries neither status nor forSale, so it too gets no extra popover line. */
  it("adds no line for an object without status or forSale", () => {
    expect(popoverInfoFor({ objectType: "section" } as unknown as SelectableObject)).toBe("")
  })
})

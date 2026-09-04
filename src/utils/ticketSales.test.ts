import { describe, expect, it } from "vitest"
import { formatSoldPercentage, resolveTotalTickets, soldProgressWidth } from "./ticketSales"

describe("resolveTotalTickets", () => {
  /**
   * Tickets held in an open basket are neither sold nor buyable. Rebuilding capacity from those two figures
   * loses them, so the room an organizer reads would shrink whenever a stranger started a checkout.
   */
  it("reports the capacity the server states rather than rebuilding it", () => {
    expect(resolveTotalTickets({ totalTickets: 100, totalAvailableTickets: 70, ticketsSold: 10 })).toBe(100)
  })

  /**
   * A response carrying no capacity would otherwise count every sale against zero, which renders as a sold
   * count over nothing. The reconstruction understates the room but keeps the figure readable.
   */
  it("falls back to what is buyable plus what is sold when no capacity is stated", () => {
    expect(resolveTotalTickets({ totalTickets: 0, totalAvailableTickets: 70, ticketsSold: 10 })).toBe(80)
  })
})

describe("formatSoldPercentage", () => {
  /** A room that has started selling must not read the same as one that has sold nothing. */
  it("says a sale has happened when the share rounds down to nothing", () => {
    expect(formatSoldPercentage(10, 4462)).toBe("<1%")
  })

  /** Only a sold-out room reads as full; one seat left is the moment an organizer still has a decision. */
  it("keeps a nearly sold-out room short of full", () => {
    expect(formatSoldPercentage(4461, 4462)).toBe(">99%")
  })

  it("reports a sold-out room as full", () => {
    expect(formatSoldPercentage(4462, 4462)).toBe("100%")
  })

  it("rounds an ordinary share to whole percent", () => {
    expect(formatSoldPercentage(45, 100)).toBe("45%")
  })

  /** A session with no tickets set up yet divides by zero, which would render as NaN on the card. */
  it("reports nothing sold when no capacity exists", () => {
    expect(formatSoldPercentage(0, 0)).toBe("0%")
  })
})

describe("soldProgressWidth", () => {
  /** An oversold room would otherwise draw a bar wider than its own track. */
  it("never fills past the end of the bar", () => {
    expect(soldProgressWidth(120, 100)).toBe(100)
  })

  it("leaves the bar empty when no capacity exists", () => {
    expect(soldProgressWidth(5, 0)).toBe(0)
  })

  /** The bar is the one place a fraction of a percent should still show, so it is not rounded away. */
  it("draws the true share rather than a rounded one", () => {
    expect(soldProgressWidth(1, 400)).toBeCloseTo(0.25)
  })
})

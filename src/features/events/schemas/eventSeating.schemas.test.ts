import { describe, expect, it } from "vitest"
import { normalizeEventSeatingMap } from "./eventSeating.schemas"

describe("normalizeEventSeatingMap", () => {
  /**
   * The API answers in PascalCase and the same payload arrives camelCased through other paths. Reading only one of
   * them would draw a chart with no workspace key, which renders as an empty grey box the buyer cannot act on.
   */
  it("reads the chart the same way whichever casing the API answered in", () => {
    const pascal = normalizeEventSeatingMap({
      SessionUniqueId: "session-1",
      SeatsIoPublicKey: "public-key",
      Region: "eu",
      SeatsIoEventKey: "event-key",
      HoldToken: "hold-token",
      HoldTokenExpiresAtUtc: "2026-09-05T10:00:00Z",
      Categories: [
        {
          CategoryKey: "cat-stalls",
          CategoryName: "Stalls",
          TicketTypeUniqueId: "ticket-1",
          TicketTypeName: "Stalls",
          Price: 40,
        },
      ],
      SelectedSeats: [
        {
          ObjectLabel: "A-14",
          CategoryKey: "cat-stalls",
          TicketTypeUniqueId: "ticket-1",
          TicketTypeName: "Stalls",
          Price: 40,
        },
      ],
    })

    const camel = normalizeEventSeatingMap({
      sessionUniqueId: "session-1",
      seatsIoPublicKey: "public-key",
      region: "eu",
      seatsIoEventKey: "event-key",
      holdToken: "hold-token",
      holdTokenExpiresAtUtc: "2026-09-05T10:00:00Z",
      categories: [
        {
          categoryKey: "cat-stalls",
          categoryName: "Stalls",
          ticketTypeUniqueId: "ticket-1",
          ticketTypeName: "Stalls",
          price: 40,
        },
      ],
      selectedSeats: [
        {
          objectLabel: "A-14",
          categoryKey: "cat-stalls",
          ticketTypeUniqueId: "ticket-1",
          ticketTypeName: "Stalls",
          price: 40,
        },
      ],
    })

    expect(camel).toEqual(pascal)
    expect(pascal.seatsIoPublicKey).toBe("public-key")
    expect(pascal.selectedSeats[0].objectLabel).toBe("A-14")
  })

  /**
   * A session whose chart has no categories priced yet still has to render rather than throw, because the buyer is
   * shown the map before they are shown a price.
   */
  it("reads a chart that carries no categories or seats yet", () => {
    const seating = normalizeEventSeatingMap({
      SessionUniqueId: "session-1",
      SeatsIoPublicKey: "public-key",
      SeatsIoEventKey: "event-key",
      HoldToken: "hold-token",
    })

    expect(seating.categories).toEqual([])
    expect(seating.selectedSeats).toEqual([])
    expect(seating.holdTokenExpiresAtUtc).toBeNull()
  })

  /**
   * The legend is drawn from the category's colour and the count the organizer chose to disclose. Dropping either
   * on the way in would leave a legend that names colours the chart does not use, or hides a count the organizer
   * asked for.
   */
  it("reads the legend colour and the disclosed seat count in either casing", () => {
    const pascal = normalizeEventSeatingMap({
      SessionUniqueId: "session-1",
      SeatsIoPublicKey: "public-key",
      SeatsIoEventKey: "event-key",
      HoldToken: "hold-token",
      Categories: [{ CategoryKey: "cat-stalls", Color: "#7551FF", ShowRemainingTickets: true, RemainingSeats: 12 }],
    })

    const camel = normalizeEventSeatingMap({
      sessionUniqueId: "session-1",
      seatsIoPublicKey: "public-key",
      seatsIoEventKey: "event-key",
      holdToken: "hold-token",
      categories: [{ categoryKey: "cat-stalls", color: "#7551FF", showRemainingTickets: true, remainingSeats: 12 }],
    })

    expect(camel).toEqual(pascal)
    expect(pascal.categories[0].color).toBe("#7551FF")
    expect(pascal.categories[0].showRemainingTickets).toBe(true)
    expect(pascal.categories[0].remainingSeats).toBe(12)
  })

  /**
   * A category the organizer kept private carries no count at all. Reading that silence as zero would print
   * "Sold out" on the legend beside seats that are still on sale.
   */
  it("reads a withheld seat count as no count rather than as zero", () => {
    const seating = normalizeEventSeatingMap({
      SessionUniqueId: "session-1",
      SeatsIoPublicKey: "public-key",
      SeatsIoEventKey: "event-key",
      HoldToken: "hold-token",
      Categories: [{ CategoryKey: "cat-stalls", RemainingSeats: null }],
    })

    expect(seating.categories[0].remainingSeats).toBeNull()
    expect(seating.categories[0].showRemainingTickets).toBe(false)
  })

  /**
   * Anything that is not the shape the API promises is a broken contract, and drawing a chart from it would hold
   * seats against keys nobody can trace. Failing at the boundary is the only honest answer.
   */
  it("refuses a payload that is not a seating map", () => {
    expect(() => normalizeEventSeatingMap({ SeatsIoPublicKey: 42 })).toThrow()
  })
})

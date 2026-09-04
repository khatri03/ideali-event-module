import { describe, expect, it } from "vitest"
import type { EventRegistrationTicket } from "@/api/events"
import { toSeatCategories } from "./seatCategories"

function buildTicket(overrides: Partial<EventRegistrationTicket> = {}): EventRegistrationTicket {
  return {
    uniqueId: "ticket-1",
    name: "Stalls seat",
    description: null,
    colorCode: null,
    fullPrice: 40,
    minPurchase: 1,
    maxPurchase: null,
    totalQuantity: null,
    availableForSale: null,
    ticketsSold: null,
    showRemainingTickets: false,
    seatCategoryName: "Stalls",
    seatCategoryColor: "#7551FF",
    nextSeatsAvailableAtUtc: null,
    isActive: true,
    salesStartDateUtc: null,
    salesEndDateUtc: null,
    pricePeriods: [],
    ...overrides,
  }
}

describe("toSeatCategories", () => {
  /** The legend captions the chart, so it has to carry the chart's own name and colour for the category. */
  it("names and colours a category from the ticket type that prices it", () => {
    const [category] = toSeatCategories([buildTicket()])

    expect(category.categoryName).toBe("Stalls")
    expect(category.color).toBe("#7551FF")
    expect(category.price).toBe(40)
  })

  /** A ticket type sold by quantity has no place on a seat map's key, and would caption a colour nobody drew. */
  it("leaves out a ticket type that prices no chart category", () => {
    const categories = toSeatCategories([
      buildTicket({ uniqueId: "seated", seatCategoryName: "Stalls" }),
      buildTicket({ uniqueId: "general", seatCategoryName: null, seatCategoryColor: null }),
    ])

    expect(categories.map((category) => category.ticketTypeUniqueId)).toEqual(["seated"])
  })

  /** A count the organizer chose to withhold must not survive into the rendered legend in any form. */
  it("withholds the seats left when the organizer kept the count private", () => {
    const [category] = toSeatCategories([
      buildTicket({ showRemainingTickets: false, totalQuantity: 20, ticketsSold: 8 }),
    ])

    expect(category.remainingSeats).toBeNull()
  })

  /** Opting in means the buyer sees the same arithmetic the quantity form runs: capacity less what has sold. */
  it("counts down from capacity when the organizer opted in", () => {
    const [category] = toSeatCategories([
      buildTicket({ showRemainingTickets: true, totalQuantity: 20, ticketsSold: 8 }),
    ])

    expect(category.remainingSeats).toBe(12)
  })

  /** A category with no capacity recorded is not sold out, and a zero here would turn buyers away from live seats. */
  it("reports no count rather than zero when the ticket type records no capacity", () => {
    const [category] = toSeatCategories([
      buildTicket({ showRemainingTickets: true, totalQuantity: null, availableForSale: null }),
    ])

    expect(category.remainingSeats).toBeNull()
  })
})

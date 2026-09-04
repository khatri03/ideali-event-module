import { describe, expect, it } from "vitest"
import type { EventRegistrationTicket } from "@/api/events"
import { getTicketRemainingLabel } from "./ticketSelection"

function buildTicket(overrides: Partial<EventRegistrationTicket> = {}): EventRegistrationTicket {
  return {
    uniqueId: "ticket-1",
    name: "General Admission",
    description: null,
    colorCode: null,
    fullPrice: 25,
    minPurchase: 1,
    maxPurchase: null,
    totalQuantity: 2000,
    availableForSale: 1200,
    ticketsSold: 800,
    seatCategoryName: null,
    seatCategoryColor: null,
    nextSeatsAvailableAtUtc: null,
    isActive: true,
    salesStartDateUtc: null,
    salesEndDateUtc: null,
    showRemainingTickets: true,
    pricePeriods: [],
    ...overrides,
  }
}

describe("getTicketRemainingLabel", () => {
  it("ReportsNothingWhenTheOrganizerKeepsTheCountPrivate", () => {
    expect(getTicketRemainingLabel(buildTicket({ showRemainingTickets: false }))).toBeNull()
  })

  it("ReportsTheSeatsLeftWhenTheOrganizerOptedIn", () => {
    expect(getTicketRemainingLabel(buildTicket())).toEqual({ text: "1,200 left", isSoldOut: false })
  })

  it("FallsBackToCapacityMinusSoldWhenAvailabilityIsUnknown", () => {
    const label = getTicketRemainingLabel(buildTicket({ availableForSale: null }))

    expect(label).toEqual({ text: "1,200 left", isSoldOut: false })
  })

  it("ReportsSoldOutWhenNothingIsLeft", () => {
    expect(getTicketRemainingLabel(buildTicket({ availableForSale: 0 }))).toEqual({
      text: "Sold out",
      isSoldOut: true,
    })
  })

  it("ReportsNothingWhenTheTicketTypeHasNoCapacityToCountDown", () => {
    const uncapped = buildTicket({ availableForSale: null, totalQuantity: null })

    expect(getTicketRemainingLabel(uncapped)).toBeNull()
  })
})

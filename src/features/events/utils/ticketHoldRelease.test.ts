import { describe, expect, it } from "vitest"
import type { EventRegistrationSession, EventRegistrationTicket } from "@/api/events"
import { getTicketHoldRelease, hasTicketOnHold } from "./ticketSelection"

const NOW = new Date("2026-08-07T12:00:00Z")

function buildTicket(overrides: Partial<EventRegistrationTicket> = {}): EventRegistrationTicket {
  return {
    uniqueId: "ticket-1",
    name: "General Admission",
    description: null,
    colorCode: null,
    fullPrice: 25,
    minPurchase: 1,
    maxPurchase: null,
    totalQuantity: 20,
    availableForSale: 0,
    ticketsSold: 0,
    showRemainingTickets: false,
    nextSeatsAvailableAtUtc: "2026-08-07T12:04:00Z",
    isActive: true,
    salesStartDateUtc: null,
    salesEndDateUtc: null,
    pricePeriods: [],
    ...overrides,
  }
}

function buildSession(tickets: EventRegistrationTicket[]): EventRegistrationSession {
  return {
    uniqueId: "session-1",
    name: "Evening Show",
    ticketTypes: tickets,
  } as EventRegistrationSession
}

describe("getTicketHoldRelease", () => {
  it("ReportsTheReleaseTimeWhenEverySeatIsHeld", () => {
    expect(getTicketHoldRelease(buildTicket(), NOW)).toEqual(new Date("2026-08-07T12:04:00Z"))
  })

  it("ReportsNothingWhenSeatsAreStillOnSale", () => {
    expect(getTicketHoldRelease(buildTicket({ availableForSale: 3 }), NOW)).toBeNull()
  })

  it("ReportsNothingWhenTheTicketTypeIsSoldOutForGood", () => {
    expect(getTicketHoldRelease(buildTicket({ nextSeatsAvailableAtUtc: null }), NOW)).toBeNull()
  })

  it("ReportsNothingWhenTheReleaseTimeHasAlreadyPassed", () => {
    const stale = buildTicket({ nextSeatsAvailableAtUtc: "2026-08-07T11:59:00Z" })
    expect(getTicketHoldRelease(stale, NOW)).toBeNull()
  })

  it("TreatsAMissingCounterAsSoldOutRatherThanAvailable", () => {
    const unknown = buildTicket({ availableForSale: null, totalQuantity: null })
    expect(getTicketHoldRelease(unknown, NOW)).toEqual(new Date("2026-08-07T12:04:00Z"))
  })
})

describe("hasTicketOnHold", () => {
  it("IsTrueWhenAnySessionHoldsAReleasableTicketType", () => {
    const sessions = [
      buildSession([buildTicket({ uniqueId: "sold", availableForSale: 5 })]),
      buildSession([buildTicket({ uniqueId: "held" })]),
    ]

    expect(hasTicketOnHold(sessions, NOW)).toBe(true)
  })

  it("IsFalseWhenEverySessionHasSeatsOnSale", () => {
    const sessions = [buildSession([buildTicket({ availableForSale: 2 })])]

    expect(hasTicketOnHold(sessions, NOW)).toBe(false)
  })

  it("IsFalseWhenTheOnlySoldOutTicketTypeIsNotComingBack", () => {
    const sessions = [buildSession([buildTicket({ nextSeatsAvailableAtUtc: null })])]

    expect(hasTicketOnHold(sessions, NOW)).toBe(false)
  })
})

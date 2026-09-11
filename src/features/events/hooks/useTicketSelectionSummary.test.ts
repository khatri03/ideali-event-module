import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import type { EventRegistrationSession, EventRegistrationTicket } from "@/api/events"
import type { SeatIdentity } from "@/features/events/utils/seatGrouping"
import { useTicketSelectionSummary } from "./useTicketSelectionSummary"

function buildTicket(overrides: Partial<EventRegistrationTicket> = {}): EventRegistrationTicket {
  return {
    uniqueId: "ticket-1",
    name: "Standard Seat",
    description: null,
    colorCode: null,
    fullPrice: 150,
    minPurchase: 1,
    maxPurchase: null,
    totalQuantity: null,
    availableForSale: null,
    ticketsSold: null,
    showRemainingTickets: false,
    seatCategoryName: "Standard Seat",
    seatCategoryColor: "#7551FF",
    nextSeatsAvailableAtUtc: null,
    isActive: true,
    salesStartDateUtc: null,
    salesEndDateUtc: null,
    pricePeriods: [],
    ...overrides,
  }
}

function buildSession(overrides: Partial<EventRegistrationSession> = {}): EventRegistrationSession {
  return {
    uniqueId: "session-1",
    name: "CME",
    description: null,
    bannerUrl: null,
    requiresAttendeeInfo: true,
    offersSeatSelection: true,
    setupState: "Ready for sale",
    bookingStatus: "Open",
    startDate: null,
    endDate: null,
    bookingStartDate: null,
    bookingEndDate: null,
    ticketTypes: [buildTicket()],
    ...overrides,
  }
}

/** Every attendee slot label the hook derived, in order, for the one ticket under test. */
function attendeeLabels(
  quantities: Record<string, number>,
  seatsByTicketType: Record<string, SeatIdentity[]>,
  session = buildSession(),
): string[] {
  const { result } = renderHook(() =>
    useTicketSelectionSummary([session], quantities, null, seatsByTicketType),
  )

  return result.current.attendeeSessionGroups.flatMap((sessionGroup) =>
    sessionGroup.tickets.flatMap((ticketGroup) => ticketGroup.slots.map((slot) => slot.attendeeLabel)),
  )
}

describe("useTicketSelectionSummary attendee slot labels", () => {
  /**
   * A buyer typing names against four seated rows has to know which of their seats each row is. The bare plan label
   * "18-1" hides which half is the table and which the seat, so the slot spells both out the way the basket does.
   */
  it("names a seated slot by its seat and table rather than the bare plan label", () => {
    const labels = attendeeLabels(
      { "ticket-1": 1 },
      { "ticket-1": [{ objectLabel: "18-1", objectType: "seat" }] },
    )

    expect(labels).toEqual(["Seat 1 at Table 18"])
  })

  /**
   * A table booked whole is one object with a bare number, and calling it a seat would tell the buyer they bought a
   * chair. Its slot names the table so the buyer confirms what they actually took.
   */
  it("names a table booked whole a table, not a seat", () => {
    const labels = attendeeLabels(
      { "ticket-1": 1 },
      { "ticket-1": [{ objectLabel: "9", objectType: "table" }] },
    )

    expect(labels).toEqual(["Table 9"])
  })

  /**
   * Seats fill the slots in the order the server lists them, so the second name typed belongs to the second seat.
   * A slot with no seat behind it is an unseated ticket and falls back to a plain attendee number.
   */
  it("labels each seat in order and numbers any slot with no seat behind it", () => {
    const labels = attendeeLabels(
      { "ticket-1": 3 },
      { "ticket-1": [{ objectLabel: "18-1", objectType: "seat" }, { objectLabel: "18-2", objectType: "seat" }] },
    )

    expect(labels).toEqual(["Seat 1 at Table 18", "Seat 2 at Table 18", "Attendee 3"])
  })
})

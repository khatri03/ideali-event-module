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

describe("useTicketSelectionSummary attendee-info gate", () => {
  /**
   * The organizer turning attendee info off for a session means the buyer is never asked for it: that
   * session produces no attendee groups and no slots, so nothing is rendered and nothing is submitted.
   */
  it("builds no attendee slots for a selected session the organizer left attendee-info off", () => {
    const session = buildSession({ requiresAttendeeInfo: false })
    const { result } = renderHook(() => useTicketSelectionSummary([session], { "ticket-1": 2 }, null))

    expect(result.current.attendeeSessionGroups).toEqual([])
    expect(result.current.attendeeSlotEntries).toEqual([])
    expect(result.current.requiresAttendeeInfo).toBe(false)
  })

  /**
   * With two sessions in the cart, only the one marked attendee-info-required contributes slots. This is
   * the reported bug's core: a disabled session must not drag attendee questions in beside an enabled one.
   */
  it("keeps slots only for the required session when the cart mixes required and disabled sessions", () => {
    const required = buildSession({
      uniqueId: "session-required",
      requiresAttendeeInfo: true,
      ticketTypes: [buildTicket({ uniqueId: "ticket-required", name: "Required Seat" })],
    })
    const disabled = buildSession({
      uniqueId: "session-disabled",
      requiresAttendeeInfo: false,
      ticketTypes: [buildTicket({ uniqueId: "ticket-disabled", name: "Open Seat" })],
    })

    const { result } = renderHook(() =>
      useTicketSelectionSummary([required, disabled], { "ticket-required": 1, "ticket-disabled": 1 }, null),
    )

    expect(result.current.attendeeSessionGroups.map((group) => group.sessionId)).toEqual(["session-required"])
    expect(result.current.attendeeSlotEntries.map((slot) => slot.ticketId)).toEqual(["ticket-required"])
    expect(result.current.requiresAttendeeInfo).toBe(true)
  })
})

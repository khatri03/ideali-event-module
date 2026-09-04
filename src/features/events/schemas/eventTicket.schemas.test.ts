import { describe, expect, it } from "vitest"
import { normalizeEventTicketView } from "@/features/events/schemas/eventTicket.schemas"

const PASCAL_PAYLOAD = {
  UniqueId: "11111111-1111-1111-1111-111111111111",
  TicketCode: "EVT_ABC123",
  TicketStatus: "Active",
  IsValid: true,
  QrCodeBase64: "AQIDBA==",
  CheckedInAtUtc: null,
  EventName: "Annual Convention",
  EventThemeColor: "#123456",
  SessionName: "Friday Dinner",
  SessionStartDateUtc: "2026-09-04T18:00:00",
  SessionEndDateUtc: "2026-09-04T22:00:00",
  VenueName: "Grand Hall",
  VenueAddress: "100 Main Street, Toronto",
  VenueMapUrl: "https://maps.example.com/grand-hall",
  TicketTypeName: "General Admission",
  AttendeeName: "Attendee One",
  BuyerName: "Buyer One",
  InvoiceNo: "INV-1001",
  OrganizerName: "Test Organizer",
}

describe("normalizeEventTicketView", () => {
  it("Normalize_PascalCasePayload_MapsEveryField", () => {
    const ticket = normalizeEventTicketView(PASCAL_PAYLOAD)

    expect(ticket).toEqual({
      uniqueId: "11111111-1111-1111-1111-111111111111",
      ticketCode: "EVT_ABC123",
      ticketStatus: "Active",
      isValid: true,
      qrCodeBase64: "AQIDBA==",
      checkedInAtUtc: null,
      eventName: "Annual Convention",
      eventThemeColor: "#123456",
      sessionName: "Friday Dinner",
      sessionStartDateUtc: "2026-09-04T18:00:00",
      sessionEndDateUtc: "2026-09-04T22:00:00",
      venueName: "Grand Hall",
      venueAddress: "100 Main Street, Toronto",
      venueMapUrl: "https://maps.example.com/grand-hall",
      ticketTypeName: "General Admission",
      seatLabel: null,
      attendeeName: "Attendee One",
      buyerName: "Buyer One",
      invoiceNo: "INV-1001",
      organizerName: "Test Organizer",
    })
  })

  it("Normalize_CamelCasePayload_MapsTheSameWay", () => {
    const ticket = normalizeEventTicketView({
      uniqueId: "22222222-2222-2222-2222-222222222222",
      ticketCode: "EVT_XYZ789",
      ticketStatus: "CheckedIn",
      isValid: true,
      qrCodeBase64: "AQIDBA==",
      checkedInAtUtc: "2026-09-04T18:30:00",
      eventName: "Annual Convention",
      sessionName: "Friday Dinner",
      ticketTypeName: "General Admission",
      organizerName: "Test Organizer",
    })

    expect(ticket.ticketCode).toBe("EVT_XYZ789")
    expect(ticket.ticketStatus).toBe("CheckedIn")
    expect(ticket.checkedInAtUtc).toBe("2026-09-04T18:30:00")
    expect(ticket.isValid).toBe(true)
  })

  it("Normalize_MissingOptionalFields_FallsBackToNull", () => {
    const ticket = normalizeEventTicketView({
      UniqueId: "33333333-3333-3333-3333-333333333333",
      TicketCode: "EVT_MIN",
      TicketStatus: "Active",
      IsValid: true,
      EventName: "Minimal Event",
      SessionName: "Only Session",
      TicketTypeName: "General",
      OrganizerName: "Organizer",
    })

    expect(ticket.venueName).toBeNull()
    expect(ticket.venueAddress).toBeNull()
    expect(ticket.attendeeName).toBeNull()
    expect(ticket.invoiceNo).toBeNull()
    expect(ticket.qrCodeBase64).toBeNull()
  })

  it("Normalize_VoidedTicket_DropsTheQrCode", () => {
    const ticket = normalizeEventTicketView({
      ...PASCAL_PAYLOAD,
      TicketStatus: "Cancelled",
      IsValid: false,
    })

    expect(ticket.isValid).toBe(false)
    expect(ticket.qrCodeBase64).toBeNull()
  })

  it("Normalize_VoidedTicketStillCarryingAQr_WithholdsItAnyway", () => {
    const ticket = normalizeEventTicketView({
      ...PASCAL_PAYLOAD,
      TicketStatus: "Refunded",
      IsValid: false,
      QrCodeBase64: "AQIDBA==",
    })

    expect(ticket.qrCodeBase64).toBeNull()
  })

  it("Normalize_MissingIsValidFlag_DerivesItFromTheStatus", () => {
    const active = normalizeEventTicketView({ TicketCode: "A", TicketStatus: "Active", QrCodeBase64: "AQIDBA==" })
    const cancelled = normalizeEventTicketView({ TicketCode: "B", TicketStatus: "Cancelled", QrCodeBase64: "AQIDBA==" })

    expect(active.isValid).toBe(true)
    expect(active.qrCodeBase64).toBe("AQIDBA==")
    expect(cancelled.isValid).toBe(false)
    expect(cancelled.qrCodeBase64).toBeNull()
  })

  it("Normalize_UnknownStatus_Throws", () => {
    expect(() => normalizeEventTicketView({ TicketCode: "C", TicketStatus: "Exploded" })).toThrow()
  })

  /**
   * A numbered ticket has to name its seat wherever it is shown. Dropping the seat in the mapping would leave the
   * holder with a ticket that admits them to the room and nothing more.
   */
  it("Normalize_TicketForANumberedSeat_KeepsTheSeatLabel", () => {
    expect(normalizeEventTicketView({ ...PASCAL_PAYLOAD, SeatLabel: "A-14" }).seatLabel).toBe("A-14")
  })

  /**
   * General admission has no seat, and a blank one on screen would read as a seat that failed to load rather than
   * a ticket that never had one.
   */
  it("Normalize_GeneralAdmissionTicket_CarriesNoSeat", () => {
    expect(normalizeEventTicketView(PASCAL_PAYLOAD).seatLabel).toBeNull()
  })
})

import { z } from "zod"

export const eventTicketStatusSchema = z.enum(["Active", "CheckedIn", "Cancelled", "Refunded"])
export type EventTicketStatus = z.infer<typeof eventTicketStatusSchema>

/** The API answers in PascalCase or camelCase depending on the serializer, so accept both. */
const eventTicketViewSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  TicketCode: z.string().optional(),
  ticketCode: z.string().optional(),
  TicketStatus: eventTicketStatusSchema.optional(),
  ticketStatus: eventTicketStatusSchema.optional(),
  IsValid: z.boolean().optional(),
  isValid: z.boolean().optional(),
  QrCodeBase64: z.string().nullable().optional(),
  qrCodeBase64: z.string().nullable().optional(),
  CheckedInAtUtc: z.string().nullable().optional(),
  checkedInAtUtc: z.string().nullable().optional(),
  EventName: z.string().optional(),
  eventName: z.string().optional(),
  EventThemeColor: z.string().nullable().optional(),
  eventThemeColor: z.string().nullable().optional(),
  SessionName: z.string().optional(),
  sessionName: z.string().optional(),
  SessionStartDateUtc: z.string().nullable().optional(),
  sessionStartDateUtc: z.string().nullable().optional(),
  SessionEndDateUtc: z.string().nullable().optional(),
  sessionEndDateUtc: z.string().nullable().optional(),
  VenueName: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  VenueAddress: z.string().nullable().optional(),
  venueAddress: z.string().nullable().optional(),
  VenueMapUrl: z.string().nullable().optional(),
  venueMapUrl: z.string().nullable().optional(),
  TicketTypeName: z.string().optional(),
  ticketTypeName: z.string().optional(),
  SeatLabel: z.string().nullable().optional(),
  seatLabel: z.string().nullable().optional(),
  AttendeeName: z.string().nullable().optional(),
  attendeeName: z.string().nullable().optional(),
  BuyerName: z.string().nullable().optional(),
  buyerName: z.string().nullable().optional(),
  InvoiceNo: z.string().nullable().optional(),
  invoiceNo: z.string().nullable().optional(),
  OrganizerName: z.string().optional(),
  organizerName: z.string().optional(),
})

export interface EventTicketView {
  uniqueId: string
  ticketCode: string
  ticketStatus: EventTicketStatus
  /** False once cancelled or refunded, which is when the QR is withheld. */
  isValid: boolean
  qrCodeBase64: string | null
  checkedInAtUtc: string | null
  eventName: string
  eventThemeColor: string | null
  sessionName: string
  sessionStartDateUtc: string | null
  sessionEndDateUtc: string | null
  venueName: string | null
  venueAddress: string | null
  venueMapUrl: string | null
  ticketTypeName: string
  /** Seat this ticket admits its holder to, or null when the session sells general admission. */
  seatLabel: string | null
  attendeeName: string | null
  buyerName: string | null
  invoiceNo: string | null
  organizerName: string
}

export function normalizeEventTicketView(payload: unknown): EventTicketView {
  const parsed = eventTicketViewSchema.parse(payload)
  const ticketStatus = parsed.TicketStatus ?? parsed.ticketStatus ?? "Active"
  const qrCodeBase64 = parsed.QrCodeBase64 ?? parsed.qrCodeBase64 ?? null
  const isValid = parsed.IsValid ?? parsed.isValid ?? (ticketStatus === "Active" || ticketStatus === "CheckedIn")

  return {
    uniqueId: parsed.UniqueId ?? parsed.uniqueId ?? "",
    ticketCode: parsed.TicketCode ?? parsed.ticketCode ?? "",
    ticketStatus,
    isValid,
    // A voided ticket must never present a scannable code, whatever the server sent.
    qrCodeBase64: isValid ? qrCodeBase64 : null,
    checkedInAtUtc: parsed.CheckedInAtUtc ?? parsed.checkedInAtUtc ?? null,
    eventName: parsed.EventName ?? parsed.eventName ?? "",
    eventThemeColor: parsed.EventThemeColor ?? parsed.eventThemeColor ?? null,
    sessionName: parsed.SessionName ?? parsed.sessionName ?? "",
    sessionStartDateUtc: parsed.SessionStartDateUtc ?? parsed.sessionStartDateUtc ?? null,
    sessionEndDateUtc: parsed.SessionEndDateUtc ?? parsed.sessionEndDateUtc ?? null,
    venueName: parsed.VenueName ?? parsed.venueName ?? null,
    venueAddress: parsed.VenueAddress ?? parsed.venueAddress ?? null,
    venueMapUrl: parsed.VenueMapUrl ?? parsed.venueMapUrl ?? null,
    ticketTypeName: parsed.TicketTypeName ?? parsed.ticketTypeName ?? "",
    seatLabel: parsed.SeatLabel ?? parsed.seatLabel ?? null,
    attendeeName: parsed.AttendeeName ?? parsed.attendeeName ?? null,
    buyerName: parsed.BuyerName ?? parsed.buyerName ?? null,
    invoiceNo: parsed.InvoiceNo ?? parsed.invoiceNo ?? null,
    organizerName: parsed.OrganizerName ?? parsed.organizerName ?? "",
  }
}

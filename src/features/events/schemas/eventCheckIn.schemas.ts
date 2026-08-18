import { z } from "zod"
import { eventTicketStatusSchema } from "@/features/events/schemas/eventTicket.schemas"

export const ATTENDEE_SCOPES = ["All", "Expected", "Arrived"] as const
export type AttendeeScope = (typeof ATTENDEE_SCOPES)[number]

/**
 * Every way a scan can end. The door needs these apart because each one puts a different person in
 * front of the operator: a guest to wave through, a guest already inside, or a ticket that never
 * belonged here.
 */
export const checkInOutcomeSchema = z.enum(["Success", "AlreadyCheckedIn", "Invalid", "ManualOverride"])
export type CheckInOutcome = z.infer<typeof checkInOutcomeSchema>

export const attendeeSchema = z.object({
  ticketUniqueId: z.string(),
  ticketCode: z.string(),
  attendeeName: z.string().nullish().transform((value) => value ?? null),
  attendeeEmail: z.string().nullish().transform((value) => value ?? null),
  ticketTypeName: z.string().default(""),
  invoiceUniqueId: z.string().default(""),
  invoiceNo: z.string().default(""),
  ticketStatus: eventTicketStatusSchema,
  checkedInAtUtc: z.string().nullish().transform((value) => value ?? null),
  checkedInBy: z.string().nullish().transform((value) => value ?? null),
  // A guest who reads out an invoice number is admitted from this row without a ticket ever being
  // scanned, so the balance has to travel with the row or nobody sees it before the door opens.
  outstandingAmount: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((value) => (value == null ? null : String(value))),
})
export type Attendee = z.infer<typeof attendeeSchema>

export const attendeeCountsSchema = z.object({
  issued: z.coerce.number().int().default(0),
  arrived: z.coerce.number().int().default(0),
  expected: z.coerce.number().int().default(0),
})
export type AttendeeCounts = z.infer<typeof attendeeCountsSchema>

export const attendeeRosterSchema = z.object({
  sessionName: z.string().default(""),
  counts: attendeeCountsSchema,
  attendees: z.object({
    pageNo: z.coerce.number().int().default(1),
    pageSize: z.coerce.number().int().default(20),
    totalRecordsCount: z.coerce.number().int().default(0),
    pageData: z.array(attendeeSchema).default([]),
  }),
  // One currency for the whole roster: it belongs to the event taking the money, not to any one ticket.
  outstandingCurrency: z.string().nullish().transform((value) => value ?? null),
  // The two instants a scan is judged against, null on either side when the session was never dated.
  // Carried so the desk can be told how long is left rather than learning it from a refused scan.
  checkInOpensAtUtc: z.string().nullish().transform((value) => value ?? null),
  checkInClosesAtUtc: z.string().nullish().transform((value) => value ?? null),
  // The server's clock when this roster was read. A door tablet ten minutes fast would otherwise count
  // down to zero while the server still refuses the scan, so the countdown runs off an offset from this.
  serverTimeUtc: z.string(),
})
export type AttendeeRoster = z.infer<typeof attendeeRosterSchema>

export const checkInResultSchema = z.object({
  ticketCode: z.string(),
  attendeeName: z.string().nullish().transform((value) => value ?? null),
  ticketStatus: eventTicketStatusSchema,
  checkInStatus: checkInOutcomeSchema,
  checkedInAtUtc: z.string(),
  message: z.string().nullish().transform((value) => value ?? null),
  // Kept as text all the way to the screen: the desk is about to ask someone for this figure, and a
  // round trip through a float is how the amount asked for stops matching the amount owed.
  outstandingAmount: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((value) => (value == null ? null : String(value))),
  outstandingCurrency: z.string().nullish().transform((value) => value ?? null),
})
export type CheckInResult = z.infer<typeof checkInResultSchema>

export const checkInUndoResultSchema = z.object({
  ticketCode: z.string(),
  attendeeName: z.string().nullish().transform((value) => value ?? null),
  ticketStatus: eventTicketStatusSchema,
  reversedAtUtc: z.string(),
  message: z.string().nullish().transform((value) => value ?? null),
})
export type CheckInUndoResult = z.infer<typeof checkInUndoResultSchema>

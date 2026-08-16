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
})
export type AttendeeRoster = z.infer<typeof attendeeRosterSchema>

export const checkInResultSchema = z.object({
  ticketCode: z.string(),
  ticketStatus: eventTicketStatusSchema,
  checkInStatus: checkInOutcomeSchema,
  checkedInAtUtc: z.string(),
  message: z.string().nullish().transform((value) => value ?? null),
})
export type CheckInResult = z.infer<typeof checkInResultSchema>

export const checkInUndoResultSchema = z.object({
  ticketCode: z.string(),
  ticketStatus: eventTicketStatusSchema,
  reversedAtUtc: z.string(),
  message: z.string().nullish().transform((value) => value ?? null),
})
export type CheckInUndoResult = z.infer<typeof checkInUndoResultSchema>

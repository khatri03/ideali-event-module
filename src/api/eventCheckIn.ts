import { isAxiosError } from "axios"
import { client } from "@/api/client"
import { parseServicePayload, ServiceResponseError } from "@/api/serviceResponse"
import {
  attendeeRosterSchema,
  checkInResultSchema,
  checkInUndoResultSchema,
  type AttendeeRoster,
  type AttendeeScope,
  type CheckInOutcome,
  type CheckInUndoResult,
} from "@/features/events/schemas/eventCheckIn.schemas"
import { API_ROUTES } from "@/utils/routes"

export interface SessionAttendeeQuery {
  eventUniqueId: string
  sessionUniqueId: string
  search?: string
  scope?: AttendeeScope
  page?: number
  pageSize?: number
}

export interface TicketCheckInCommand {
  eventUniqueId: string
  sessionUniqueId: string
  ticketCode: string
}

/**
 * What the door screen shows after a scan. A refused ticket is an answer, not a failure: the operator
 * needs to read why on the same screen they scanned from, so it arrives here rather than as a thrown
 * error that would surface as a toast and vanish.
 */
export interface CheckInAttempt {
  outcome: CheckInOutcome
  ticketCode: string
  /** Who the ticket admits, when the server could name them - a refused code names nobody. */
  attendeeName: string | null
  /** Seat the ticket admits its holder to, or null on a general-admission ticket. */
  seatLabel: string | null
  message: string
  checkedInAtUtc: string | null
  /**
   * What the order behind this ticket still owes, as decimal text, null when nothing is outstanding.
   * The operator on the door is who collects it, and they never see the buyer's invoice.
   */
  outstandingAmount: string | null
  /** ISO code the outstanding amount is denominated in, null when the event has no payment account. */
  outstandingCurrency: string | null
}

export async function fetchSessionAttendees(query: SessionAttendeeQuery): Promise<AttendeeRoster> {
  const res = await client.get<unknown>(API_ROUTES.sessionAttendees(query.eventUniqueId, query.sessionUniqueId), {
    params: {
      search: query.search?.trim() || undefined,
      scope: query.scope ?? "All",
      pageNo: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    },
  })

  return attendeeRosterSchema.parse(parseServicePayload(res.data))
}

export async function checkInTicket(command: TicketCheckInCommand): Promise<CheckInAttempt> {
  try {
    const res = await client.post<unknown>(
      API_ROUTES.sessionTicketCheckIn(command.eventUniqueId, command.sessionUniqueId),
      { ticketCode: command.ticketCode },
    )

    const result = checkInResultSchema.parse(parseServicePayload(res.data))
    return {
      outcome: result.checkInStatus,
      ticketCode: result.ticketCode,
      attendeeName: result.attendeeName,
      seatLabel: result.seatLabel,
      message: result.message ?? "",
      checkedInAtUtc: result.checkedInAtUtc,
      outstandingAmount: result.outstandingAmount,
      outstandingCurrency: result.outstandingCurrency,
    }
  } catch (error) {
    const refusal = refusalMessage(error)
    if (!refusal) {
      throw error
    }

    return {
      outcome: "Invalid",
      ticketCode: command.ticketCode,
      attendeeName: null,
      seatLabel: null,
      message: refusal,
      checkedInAtUtc: null,
      outstandingAmount: null,
      outstandingCurrency: null,
    }
  }
}

export async function undoTicketCheckIn(command: TicketCheckInCommand): Promise<CheckInUndoResult> {
  try {
    const res = await client.post<unknown>(
      API_ROUTES.sessionTicketCheckInUndo(command.eventUniqueId, command.sessionUniqueId),
      { ticketCode: command.ticketCode },
    )

    return checkInUndoResultSchema.parse(parseServicePayload(res.data))
  } catch (error) {
    const refusal = refusalMessage(error)
    throw refusal ? new ServiceResponseError(refusal) : error
  }
}

/**
 * A rejected ticket comes back as a 400 carrying its own sentence. Anything else - no session, no
 * permission, no network - is not the door's business to interpret and is left to the caller.
 */
function refusalMessage(error: unknown): string | null {
  if (!isAxiosError(error) || error.response?.status !== 400) {
    return null
  }

  const body = error.response?.data as { Message?: string; message?: string } | undefined
  return (body?.Message ?? body?.message)?.trim() || null
}

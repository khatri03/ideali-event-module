import { AxiosError, AxiosHeaders } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ServiceResponseError } from "./serviceResponse"
import { checkInTicket, fetchSessionAttendees, undoTicketCheckIn } from "./eventCheckIn"

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))

vi.mock("./client", () => ({ client: { get: getMock, post: postMock } }))

const SESSION = { eventUniqueId: "event-1", sessionUniqueId: "session-1" }

function badRequest(message: string) {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, null, {
    status: 400,
    statusText: "Bad Request",
    data: { Success: false, Message: message },
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  })
}

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset()
})

describe("fetchSessionAttendees", () => {
  it("reads the roster the door screen renders", async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        Data: {
          SessionName: "Opening Night",
          Counts: { Issued: 2, Arrived: 1, Expected: 1 },
          Attendees: {
            PageNo: 1,
            PageSize: 25,
            TotalRecordsCount: 2,
            PageData: [
              {
                TicketUniqueId: "ticket-1",
                TicketCode: "TKT-1",
                AttendeeName: "Ayesha Khan",
                AttendeeEmail: null,
                TicketTypeName: "General",
                TicketStatus: "Active",
                CheckedInAtUtc: null,
                CheckedInBy: null,
              },
            ],
          },
        },
      },
    })

    const roster = await fetchSessionAttendees({ ...SESSION, search: "  ayesha  " })

    expect(roster.sessionName).toBe("Opening Night")
    expect(roster.counts).toEqual({ issued: 2, arrived: 1, expected: 1 })
    expect(roster.attendees.pageData[0]).toMatchObject({ ticketCode: "TKT-1", attendeeName: "Ayesha Khan" })
    expect(getMock.mock.calls[0][1].params).toMatchObject({ search: "ayesha", scope: "All" })
  })

  it("omits an all-whitespace search rather than asking for an empty match", async () => {
    getMock.mockResolvedValue({
      data: { success: true, data: { sessionName: "S", counts: {}, attendees: { pageData: [] } } },
    })

    await fetchSessionAttendees({ ...SESSION, search: "   " })

    expect(getMock.mock.calls[0][1].params.search).toBeUndefined()
  })
})

describe("checkInTicket", () => {
  it("reports an admitted ticket", async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          ticketCode: "TKT-1",
          ticketStatus: "CheckedIn",
          checkInStatus: "Success",
          checkedInAtUtc: "2026-08-17T18:00:00Z",
          message: "Ticket checked in successfully.",
        },
      },
    })

    const attempt = await checkInTicket({ ...SESSION, ticketCode: "TKT-1" })

    expect(attempt.outcome).toBe("Success")
    expect(attempt.checkedInAtUtc).toBe("2026-08-17T18:00:00Z")
  })

  it("reports a ticket that is already inside without treating it as a failure", async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          ticketCode: "TKT-1",
          ticketStatus: "CheckedIn",
          checkInStatus: "AlreadyCheckedIn",
          checkedInAtUtc: "2026-08-17T17:30:00Z",
          message: "Ticket has already been checked in.",
        },
      },
    })

    const attempt = await checkInTicket({ ...SESSION, ticketCode: "TKT-1" })

    expect(attempt.outcome).toBe("AlreadyCheckedIn")
    expect(attempt.message).toBe("Ticket has already been checked in.")
  })

  /** Money arrives as a JSON number and must reach the screen as text, never as a rounded float. */
  it("carries the outstanding balance through as decimal text", async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          ticketCode: "TKT-1",
          ticketStatus: "CheckedIn",
          checkInStatus: "Success",
          checkedInAtUtc: "2026-08-17T18:00:00Z",
          message: "Ticket checked in successfully.",
          outstandingAmount: 40.5,
          outstandingCurrency: "CAD",
        },
      },
    })

    const attempt = await checkInTicket({ ...SESSION, ticketCode: "TKT-1" })

    expect(attempt.outstandingAmount).toBe("40.5")
    expect(attempt.outstandingCurrency).toBe("CAD")
  })

  it("reports no balance for a settled order", async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          ticketCode: "TKT-1",
          ticketStatus: "CheckedIn",
          checkInStatus: "Success",
          checkedInAtUtc: "2026-08-17T18:00:00Z",
          message: "Ticket checked in successfully.",
          outstandingAmount: null,
          outstandingCurrency: null,
        },
      },
    })

    const attempt = await checkInTicket({ ...SESSION, ticketCode: "TKT-1" })

    expect(attempt.outstandingAmount).toBeNull()
  })

  /** The operator has to read why a ticket was refused, so a refusal must reach the screen, not a toast. */
  it("turns a refused ticket into a readable outcome instead of throwing", async () => {
    postMock.mockRejectedValue(badRequest("Ticket does not belong to this event session."))

    const attempt = await checkInTicket({ ...SESSION, ticketCode: "TKT-9" })

    expect(attempt.outcome).toBe("Invalid")
    expect(attempt.ticketCode).toBe("TKT-9")
    expect(attempt.message).toBe("Ticket does not belong to this event session.")
  })

  it("rethrows a failure the door cannot interpret", async () => {
    postMock.mockRejectedValue(new Error("Network Error"))

    await expect(checkInTicket({ ...SESSION, ticketCode: "TKT-1" })).rejects.toThrow("Network Error")
  })
})

describe("undoTicketCheckIn", () => {
  it("returns the reversal", async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          ticketCode: "TKT-1",
          ticketStatus: "Active",
          reversedAtUtc: "2026-08-17T18:05:00Z",
          message: "Check-in reversed.",
        },
      },
    })

    const result = await undoTicketCheckIn({ ...SESSION, ticketCode: "TKT-1" })

    expect(result.ticketStatus).toBe("Active")
    expect(result.message).toBe("Check-in reversed.")
  })

  it("surfaces the server's reason when a reversal is refused", async () => {
    postMock.mockRejectedValue(badRequest("Ticket is not checked in."))

    await expect(undoTicketCheckIn({ ...SESSION, ticketCode: "TKT-1" })).rejects.toThrow(ServiceResponseError)
    await expect(undoTicketCheckIn({ ...SESSION, ticketCode: "TKT-1" })).rejects.toThrow("Ticket is not checked in.")
  })
})

import { useCallback, useState } from "react"
import type { CheckInAttempt } from "@/api/eventCheckIn"
import { useDebounce } from "@/hooks/useDebounce"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { useResendAttendeeTicket, type AttendeeTicketResend } from "./useResendAttendeeTicket"
import { ATTENDEE_PAGE_SIZE, useSessionAttendees } from "./useSessionAttendees"
import { useTicketCheckIn, useUndoTicketCheckIn } from "./useTicketCheckIn"
import type { AttendeeScope } from "@/features/events/schemas/eventCheckIn.schemas"

/**
 * Everything the door screen holds between scans: what was last decided, what the roster is filtered
 * to, and whether the network is there to record any of it.
 */
export function useCheckInDesk(eventUniqueId: string, sessionUniqueId: string) {
  const [search, setSearch] = useState("")
  const [scope, setScope] = useState<AttendeeScope>("All")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ATTENDEE_PAGE_SIZE)
  const [attempt, setAttempt] = useState<CheckInAttempt | null>(null)

  const debouncedSearch = useDebounce(search)
  const isOnline = useOnlineStatus()
  const sessionKeys = { eventUniqueId, sessionUniqueId }

  // Narrowing the roster while sitting on page four would show an empty table, so the reset rides
  // with the change that caused it rather than trailing it from an effect.
  const changeSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const changeScope = useCallback((value: AttendeeScope) => {
    setScope(value)
    setPage(1)
  }, [])

  const rosterQuery = useSessionAttendees(
    { eventUniqueId, sessionUniqueId, search: debouncedSearch, scope, page, pageSize },
    isOnline,
  )
  // Only mutate is closed over, never the mutation result: the result is a fresh object every render,
  // and a scan handler that changes with it restarts the scanner camera after every check-in.
  const { mutate: sendCheckIn, isPending: isAdmitting, variables: admittingCode } = useTicketCheckIn(sessionKeys)
  const { mutate: sendUndo, isPending: isReversing, variables: reversingCode } = useUndoTicketCheckIn(sessionKeys)
  const { mutate: sendResend, isPending: isSendingTicket, variables: sendingTicket } = useResendAttendeeTicket()

  const admit = useCallback(
    (ticketCode: string) => {
      sendCheckIn(ticketCode, { onSuccess: setAttempt })
    },
    [sendCheckIn],
  )

  const reverse = useCallback(
    (ticketCode: string) => {
      sendUndo(ticketCode, {
        onSuccess: (result) =>
          setAttempt({
            outcome: "ManualOverride",
            ticketCode: result.ticketCode,
            message: result.message ?? "",
            checkedInAtUtc: null,
          }),
      })
    },
    [sendUndo],
  )

  const sendTicket = useCallback(
    (ticket: AttendeeTicketResend) => {
      sendResend(ticket)
    },
    [sendResend],
  )

  const busyTicketCode = isAdmitting ? admittingCode ?? null : isReversing ? reversingCode ?? null : null

  return {
    roster: rosterQuery.data,
    isLoading: rosterQuery.isLoading,
    isError: rosterQuery.isError,
    pageSize,
    setPageSize,
    page,
    setPage,
    search,
    setSearch: changeSearch,
    scope,
    setScope: changeScope,
    attempt,
    admit,
    reverse,
    sendTicket,
    sendingTicketUniqueId: isSendingTicket ? sendingTicket?.ticketUniqueId ?? null : null,
    isAdmitting,
    isReversing,
    busyTicketCode,
    isOnline,
  }
}

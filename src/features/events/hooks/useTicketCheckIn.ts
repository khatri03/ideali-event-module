import { useMutation, useQueryClient } from "@tanstack/react-query"
import { checkInTicket, undoTicketCheckIn, type CheckInAttempt } from "@/api/eventCheckIn"
import { toaster } from "@/lib/toaster"
import {
  CHECK_IN_OUTCOME_PRESENTATION,
  CHECK_IN_TOAST_DURATION_MS,
} from "@/features/events/utils/checkInOutcome"
import { extractApiError } from "@/utils/errors"

interface SessionKeys {
  eventUniqueId: string
  sessionUniqueId: string
}

export function useTicketCheckIn({ eventUniqueId, sessionUniqueId }: SessionKeys) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ticketCode: string) => checkInTicket({ eventUniqueId, sessionUniqueId, ticketCode }),
    // The card below the scanner is easy to miss with a queue moving; the toast is the part that
    // carries over the operator's eyeline whether or not they are looking at the panel.
    onSuccess: (attempt) => {
      const presentation = CHECK_IN_OUTCOME_PRESENTATION[attempt.outcome]

      toaster.create({
        type: presentation.toastType,
        title: `${presentation.heading}: ${attempt.ticketCode}`,
        description: attempt.message || undefined,
        duration: CHECK_IN_TOAST_DURATION_MS[attempt.outcome],
      })
    },
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["session-attendees", eventUniqueId, sessionUniqueId] }),
  })
}

export function useUndoTicketCheckIn({ eventUniqueId, sessionUniqueId }: SessionKeys) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ticketCode: string) => undoTicketCheckIn({ eventUniqueId, sessionUniqueId, ticketCode }),
    onSuccess: (result) =>
      toaster.create({
        type: CHECK_IN_OUTCOME_PRESENTATION.ManualOverride.toastType,
        title: `${CHECK_IN_OUTCOME_PRESENTATION.ManualOverride.heading}: ${result.ticketCode}`,
        duration: CHECK_IN_TOAST_DURATION_MS.ManualOverride,
      }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["session-attendees", eventUniqueId, sessionUniqueId] }),
  })
}

export type { CheckInAttempt }

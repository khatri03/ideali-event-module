import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createEventWizardSession, fetchEventWizardSessions, type EventWizardSessionCreateRequest } from "@/api/events"
import { extractApiError } from "@/utils/errors"

export function useEventWizardSessions(eventId?: string) {
  const query = useQuery({
    queryKey: ["events", { eventId: eventId ?? "", scope: "wizard-sessions" }],
    queryFn: async () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardSessions(eventId)
    },
    enabled: !!eventId,
    retry: false,
  })

  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.isError ? extractApiError(query.error) : "",
    refetch: query.refetch,
  }
}

export function useCreateEventWizardSession(eventId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: EventWizardSessionCreateRequest) => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return createEventWizardSession(eventId, payload)
    },
    onSuccess: () => {
      // refreshed by caller or invalidation
    },
    onError: () => {
      // handled by caller
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events", { eventId: eventId ?? "", scope: "wizard-sessions" }] })
    },
  })
}

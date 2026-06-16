import { useQuery } from "@tanstack/react-query"
import { fetchEventWizardReviewSummary } from "@/api/events"

export function useEventReviewSummary(eventId?: string, enabled = true) {
  return useQuery({
    queryKey: ["events", "review-summary", eventId],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardReviewSummary(eventId)
    },
    enabled: Boolean(eventId) && enabled,
    retry: false,
  })
}

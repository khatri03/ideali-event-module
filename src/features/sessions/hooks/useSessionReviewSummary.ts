import { useQuery } from "@tanstack/react-query"
import { fetchSessionWizardReviewSummary } from "@/api/sessions"

export function useSessionReviewSummary(sessionId?: string, enabled = true) {
  return useQuery({
    queryKey: ["sessions", "review-summary", sessionId],
    queryFn: () => {
      if (!sessionId) {
        throw new Error("Session id is required.")
      }

      return fetchSessionWizardReviewSummary(sessionId)
    },
    enabled: Boolean(sessionId) && enabled,
    retry: false,
  })
}

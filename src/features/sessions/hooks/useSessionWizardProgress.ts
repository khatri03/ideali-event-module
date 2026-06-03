import { useQuery } from "@tanstack/react-query"
import { fetchSessionWizardProgress } from "@/api/sessions"

export function useSessionWizardProgress(sessionId?: string) {
  return useQuery({
    queryKey: ["sessions", "wizard-progress", sessionId],
    queryFn: () => fetchSessionWizardProgress(sessionId ?? ""),
    enabled: !!sessionId,
    retry: false,
  })
}

import { useQuery } from "@tanstack/react-query"
import { fetchSessionWizardSetupState } from "@/api/sessions"

export function useSessionWizardSetupState(sessionId?: string) {
  return useQuery({
    queryKey: ["sessions", "setup-state", sessionId],
    queryFn: () => fetchSessionWizardSetupState(sessionId ?? ""),
    enabled: !!sessionId,
    retry: false,
  })
}

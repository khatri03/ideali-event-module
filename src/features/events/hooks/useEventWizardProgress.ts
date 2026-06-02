import { useQuery } from "@tanstack/react-query"
import { fetchEventWizardProgress } from "@/api/events"

export function useEventWizardProgress(eventId?: string) {
  return useQuery({
    queryKey: ["events", "wizard-progress", eventId],
    queryFn: () => fetchEventWizardProgress(eventId ?? ""),
    enabled: !!eventId,
    retry: false,
  })
}

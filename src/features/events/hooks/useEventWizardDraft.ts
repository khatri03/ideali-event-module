import { useQuery } from "@tanstack/react-query"
import { fetchEvent } from "@/api/events"

export function useEventWizardDraft(eventId?: string) {
  return useQuery({
    queryKey: ["events", "wizard-draft", eventId],
    queryFn: () => fetchEvent(eventId ?? ""),
    enabled: !!eventId,
    retry: false,
  })
}

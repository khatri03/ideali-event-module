import { useQuery } from "@tanstack/react-query"
import {
  fetchEvent,
  fetchEventWizardAdvancedSettings,
  fetchEventWizardDescription,
  fetchEventWizardName,
  fetchEventWizardThemeColor,
} from "@/api/events"
import type { EventWizardStepSlug } from "./useEventWizard"

export type EventWizardDraftData =
  | Awaited<ReturnType<typeof fetchEvent>>
  | Awaited<ReturnType<typeof fetchEventWizardName>>
  | Awaited<ReturnType<typeof fetchEventWizardDescription>>
  | Awaited<ReturnType<typeof fetchEventWizardThemeColor>>
  | Awaited<ReturnType<typeof fetchEventWizardAdvancedSettings>>

export function useEventWizardDraft(eventId?: string, stepSlug?: EventWizardStepSlug) {
  return useQuery<EventWizardDraftData>({
    queryKey: ["events", "wizard-draft", eventId, stepSlug],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      if (stepSlug === "name") {
        return fetchEventWizardName(eventId)
      }

      if (stepSlug === "description") {
        return fetchEventWizardDescription(eventId)
      }

      if (stepSlug === "theme-color") {
        return fetchEventWizardThemeColor(eventId)
      }

      if (stepSlug === "advanced-settings") {
        return fetchEventWizardAdvancedSettings(eventId)
      }

      return fetchEvent(eventId)
    },
    enabled: !!eventId,
    retry: false,
  })
}

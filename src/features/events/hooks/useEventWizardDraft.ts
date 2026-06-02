import { useQuery } from "@tanstack/react-query"
import {
  fetchEventWizardAdvancedSettings,
  fetchEventWizardDescription,
  fetchEventWizardName,
  fetchEventWizardPaymentAccount,
  fetchEventWizardThemeColor,
} from "@/api/events"
import type { EventWizardStepSlug } from "./useEventWizard"

export type EventWizardDraftData =
  | Awaited<ReturnType<typeof fetchEventWizardName>>
  | Awaited<ReturnType<typeof fetchEventWizardDescription>>
  | Awaited<ReturnType<typeof fetchEventWizardThemeColor>>
  | Awaited<ReturnType<typeof fetchEventWizardAdvancedSettings>>
  | Awaited<ReturnType<typeof fetchEventWizardPaymentAccount>>

export function useEventWizardDraft(eventId?: string, stepSlug?: EventWizardStepSlug) {
  const isSupportedStep =
    stepSlug === "name" ||
    stepSlug === "description" ||
    stepSlug === "theme-color" ||
    stepSlug === "payment-account" ||
    stepSlug === "advanced-settings"

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

      if (stepSlug === "payment-account") {
        return fetchEventWizardPaymentAccount(eventId)
      }

      if (stepSlug === "advanced-settings") {
        return fetchEventWizardAdvancedSettings(eventId)
      }

      throw new Error("Draft loading is not implemented for this step yet.")
    },
    enabled: !!eventId && isSupportedStep,
    retry: false,
  })
}

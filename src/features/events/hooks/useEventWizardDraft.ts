import { useQuery } from "@tanstack/react-query"
import {
  fetchEventWizardBanner,
  fetchEventWizardAdvancedSettings,
  fetchEventWizardDescription,
  fetchEventWizardDateTime,
  fetchEventWizardName,
  fetchEventWizardPaymentAccount,
  fetchEventWizardThankYouEmail,
  fetchEventWizardVenue,
  fetchEventWizardThemeColor,
  fetchEventWizardTimeZone,
  fetchEventWizardTermsConditions,
} from "@/api/events"
import type { EventWizardStepSlug } from "./useEventWizard"

export type EventWizardDraftData =
  | Awaited<ReturnType<typeof fetchEventWizardName>>
  | Awaited<ReturnType<typeof fetchEventWizardDescription>>
  | Awaited<ReturnType<typeof fetchEventWizardTermsConditions>>
  | Awaited<ReturnType<typeof fetchEventWizardBanner>>
  | Awaited<ReturnType<typeof fetchEventWizardTimeZone>>
  | Awaited<ReturnType<typeof fetchEventWizardThemeColor>>
  | Awaited<ReturnType<typeof fetchEventWizardDateTime>>
  | Awaited<ReturnType<typeof fetchEventWizardAdvancedSettings>>
  | Awaited<ReturnType<typeof fetchEventWizardPaymentAccount>>
  | Awaited<ReturnType<typeof fetchEventWizardVenue>>
  | Awaited<ReturnType<typeof fetchEventWizardThankYouEmail>>

export function useEventWizardDraft(eventId?: string, stepSlug?: EventWizardStepSlug) {
  const isSupportedStep =
    stepSlug === "name" ||
    stepSlug === "description" ||
    stepSlug === "terms-conditions" ||
    stepSlug === "banner" ||
    stepSlug === "time-zone" ||
    stepSlug === "theme-color" ||
    stepSlug === "date-time" ||
    stepSlug === "payment-account" ||
    stepSlug === "venue" ||
    stepSlug === "advanced-settings" ||
    stepSlug === "thank-you-email"

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

      if (stepSlug === "terms-conditions") {
        return fetchEventWizardTermsConditions(eventId)
      }

      if (stepSlug === "banner") {
        return fetchEventWizardBanner(eventId)
      }

      if (stepSlug === "time-zone") {
        return fetchEventWizardTimeZone(eventId)
      }

      if (stepSlug === "theme-color") {
        return fetchEventWizardThemeColor(eventId)
      }

      if (stepSlug === "date-time") {
        return fetchEventWizardDateTime(eventId)
      }

      if (stepSlug === "payment-account") {
        return fetchEventWizardPaymentAccount(eventId)
      }

      if (stepSlug === "venue") {
        return fetchEventWizardVenue(eventId)
      }

      if (stepSlug === "advanced-settings") {
        return fetchEventWizardAdvancedSettings(eventId)
      }

      if (stepSlug === "thank-you-email") {
        return fetchEventWizardThankYouEmail(eventId)
      }

      throw new Error("Draft loading is not implemented for this step yet.")
    },
    enabled: !!eventId && isSupportedStep,
    retry: false,
  })
}

import { useQuery } from "@tanstack/react-query"
import {
  fetchEventWizardAdvancedSettings,
  fetchEventWizardDescription,
  fetchEventWizardThemeColor,
} from "@/api/events"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

type EventWizardResumeValues = Partial<
  Pick<EventWizardValues, "name" | "description" | "themeColor" | "purchaseTimeLimitMinutes" | "visibility">
>

export function useEventWizardResumeValues(eventId?: string, lastCompletedStepNo = 0) {
  return useQuery<EventWizardResumeValues>({
    queryKey: ["events", "wizard-resume", eventId, lastCompletedStepNo],
    queryFn: async () => {
      if (!eventId || lastCompletedStepNo <= 0) {
        return {}
      }

      const [descriptionResult, themeColorResult, advancedSettingsResult] = await Promise.all([
        lastCompletedStepNo >= 1 ? fetchEventWizardDescription(eventId) : Promise.resolve(null),
        lastCompletedStepNo >= 2 ? fetchEventWizardThemeColor(eventId) : Promise.resolve(null),
        lastCompletedStepNo >= 10 ? fetchEventWizardAdvancedSettings(eventId) : Promise.resolve(null),
      ])

      return {
        description: descriptionResult?.description ?? "",
        themeColor: themeColorResult?.themeColor ?? "#7551FF",
        purchaseTimeLimitMinutes: advancedSettingsResult?.purchaseTimeLimit ?? undefined,
        visibility: advancedSettingsResult?.visibility ?? "Public",
      }
    },
    enabled: !!eventId,
    retry: false,
  })
}

import { auth } from "@/lib/auth"
import type { AppEvent } from "@/types"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function eventToWizardValues(event: AppEvent): EventWizardValues {
  const organizer = auth.getOrganizer()
  const defaultPaymentAccountId = organizer?.paymentAccounts?.[0]?.uniqueId ?? ""

  return {
    name: event.title,
    description: event.description,
    themeColor: event.coverColor,
    paymentAccountId: event.paymentAccountId ?? defaultPaymentAccountId,
    paymentMethods: [],
    purchaseTimeLimitHours: event.purchaseTimeLimitHours ?? undefined,
    timeZone: event.timeZone ?? "",
    sessions: event.sessions?.length
      ? event.sessions
      : [
          {
            title: "",
            startsAt: "",
            endsAt: "",
          },
        ],
  }
}

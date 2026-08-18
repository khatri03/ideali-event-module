import { auth } from "@/lib/auth"
import type { AppEvent } from "@/types"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function eventToWizardValues(event: AppEvent): EventWizardValues {
  const organizer = auth.getOrganizer()
  const defaultPaymentAccountId = organizer?.paymentAccounts?.[0]?.uniqueId ?? ""

  return {
    name: event.title,
    description: event.description,
    termsConditions: event.termsConditions ?? "",
    bannerUrl: event.bannerUrl ?? "",
    timeZoneId: undefined,
    themeColor: event.coverColor,
    startDate: event.startDate ?? "",
    endDate: event.endDate ?? "",
    bookingStartDate: event.bookingStartDate ?? "",
    bookingEndDate: event.bookingEndDate ?? "",
    visibility: event.visibility ?? "Public",
    purchaseTimeLimitMinutes: event.purchaseTimeLimitMinutes ?? 15,
    applyPaymentMethodCharges: false,
    blockEntryUntilPaid: false,
    paymentAccountId: event.paymentAccountId ?? defaultPaymentAccountId,
    paymentMethods: [],
    venueUniqueId: "",
    timeZone: event.timeZone ?? "",
    sessions: event.sessions ?? [],
  }
}

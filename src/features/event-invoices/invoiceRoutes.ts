import type { EventInvoiceListItem } from "@/api/eventInvoices"
import { APP_ROUTES } from "@/utils/routes"

/** A custom invoice opens on its own page; a ticket order opens on the Event invoice detail. */
export function invoiceDetailPath({ invoiceUniqueId, invoiceType }: Pick<EventInvoiceListItem, "invoiceUniqueId" | "invoiceType">) {
  return invoiceType === "Custom"
    ? APP_ROUTES.customInvoices.detail(invoiceUniqueId)
    : APP_ROUTES.eventInvoices.detail(invoiceUniqueId)
}

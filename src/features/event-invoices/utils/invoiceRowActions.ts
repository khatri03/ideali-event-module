import type { EventInvoiceListItem } from "@/api/eventInvoices"

/**
 * Statuses where the order no longer entitles anyone to attend, so re-emailing its tickets would send
 * a pass that the gate will refuse.
 */
const NON_RESENDABLE_STATUSES = new Set(["Cancelled", "Refund", "AdjustedInSystem", "Failed"])

/**
 * Kept off the row so the organizer cannot reach the same action by opening the invoice first: the
 * detail page hides its resend buttons on the same grounds.
 */
export function canResendInvoiceTickets(invoice: Pick<EventInvoiceListItem, "invoiceStatus" | "ticketCount">): boolean {
  if (NON_RESENDABLE_STATUSES.has(invoice.invoiceStatus)) return false

  return invoice.ticketCount > 0
}

export interface EventLifecycleWindow {
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
}

export interface EventInvoiceEligibility extends EventLifecycleWindow {
  setupState: string
  ticketsSold: number
}

/** The API has spelled this state both `ReadyForSale` and `Ready For Sale`; compare on letters alone. */
export function normalizeSetupStateToken(value: string) {
  return value.replace(/[^a-z]/gi, "").toLowerCase()
}

export function isEventOnSale(setupState: string) {
  return normalizeSetupStateToken(setupState) === "readyforsale"
}

function toDate(value: string | null) {
  if (!value) return null

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Booking is open once the window has started and has not closed. A missing end date means the
 * organizer never set a close, so the window stays open rather than counting as closed.
 */
export function isEventBookingOpen(event: EventLifecycleWindow, now = new Date()) {
  const bookingStart = toDate(event.bookingStartDate)
  if (!bookingStart || bookingStart > now) return false

  const bookingEnd = toDate(event.bookingEndDate)
  return !bookingEnd || bookingEnd >= now
}

export function isEventRunning(event: EventLifecycleWindow, now = new Date()) {
  const start = toDate(event.startDate)
  if (!start || start > now) return false

  const end = toDate(event.endDate)
  return !end || end >= now
}

export function hasEventEnded(event: EventLifecycleWindow, now = new Date()) {
  const end = toDate(event.endDate)
  return end !== null && end < now
}

/**
 * An event only has invoices worth opening once money could have moved. Tickets already sold settle
 * it outright - an event taken back offline keeps the invoices it earned. Otherwise the event has to
 * be on sale *and* past the point where a buyer could have reached it; dates alone would offer the
 * invoice list on an event still sitting in review, where nothing was ever purchasable.
 */
export function hasEventInvoiceHistory(event: EventInvoiceEligibility, now = new Date()) {
  if (event.ticketsSold > 0) return true
  if (!isEventOnSale(event.setupState)) return false

  return isEventBookingOpen(event, now) || isEventRunning(event, now) || hasEventEnded(event, now)
}

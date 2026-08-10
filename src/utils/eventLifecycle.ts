export interface EventLifecycleWindow {
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
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
 * An event only has invoices worth opening once money could have moved: bookings are open, the event
 * is running, or it is over. A draft nobody could buy into has nothing to show.
 */
export function hasEventInvoiceHistory(event: EventLifecycleWindow, now = new Date()) {
  return isEventBookingOpen(event, now) || isEventRunning(event, now) || hasEventEnded(event, now)
}

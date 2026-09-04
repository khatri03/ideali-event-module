interface TicketSalesTotals {
  /** Tickets put on sale across the event or session. */
  totalTickets: number
  /** Tickets still buyable now — capacity less what is sold and what sits in open baskets. */
  totalAvailableTickets: number
  /** Tickets already bought. */
  ticketsSold: number
}

/**
 * The capacity a sale count is read against.
 *
 * Capacity comes from the server as one figure. Rebuilding it from what is still buyable plus what is sold
 * would drop the tickets sitting in open baskets, so the room would appear to shrink and grow as strangers
 * started and abandoned checkouts. The fallback covers a response that carries no capacity at all, where an
 * understated total still reads better than a sale counted against zero.
 */
export function resolveTotalTickets(totals: TicketSalesTotals) {
  return totals.totalTickets > 0 ? totals.totalTickets : totals.totalAvailableTickets + totals.ticketsSold
}

/**
 * How much of the capacity is sold, worded so neither end of the range lies.
 *
 * A rounded percentage reports a first sale in a large room as "0%" and a room with one seat left as "100%",
 * which are the two readings an organizer acts on hardest.
 */
export function formatSoldPercentage(ticketsSold: number, totalTickets: number) {
  if (totalTickets <= 0 || ticketsSold <= 0) {
    return "0%"
  }

  const percentage = (ticketsSold / totalTickets) * 100

  if (percentage < 1) {
    return "<1%"
  }

  if (percentage > 99 && ticketsSold < totalTickets) {
    return ">99%"
  }

  return `${Math.round(percentage)}%`
}

/** How far the progress bar is filled, in percent, never past its own end. */
export function soldProgressWidth(ticketsSold: number, totalTickets: number) {
  if (totalTickets <= 0 || ticketsSold <= 0) {
    return 0
  }

  return Math.min((ticketsSold / totalTickets) * 100, 100)
}

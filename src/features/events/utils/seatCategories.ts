import type { EventRegistrationTicket } from "@/api/events"
import type { EventSeatingCategory } from "@/features/events/schemas/eventSeating.schemas"
import { getTicketRemaining } from "@/features/events/utils/ticketSelection"

/**
 * Reads a seated session's legend out of the ticket types the sessions tab already loaded.
 *
 * The cart-scoped seating call answers the same categories, but only once the buyer has identified themselves and
 * opened a cart. A buyer deciding whether to register at all needs to see what each colour on the chart costs
 * before that, so the legend is built from the session payload instead.
 *
 * A ticket type with no chart category prices general admission and has no place in a seat legend.
 */
export function toSeatCategories(ticketTypes: EventRegistrationTicket[]): EventSeatingCategory[] {
  return ticketTypes
    .filter((ticket) => Boolean(ticket.seatCategoryName))
    .map((ticket) => ({
      categoryKey: ticket.uniqueId,
      categoryName: ticket.seatCategoryName ?? "",
      ticketTypeUniqueId: ticket.uniqueId,
      ticketTypeName: ticket.name,
      price: ticket.fullPrice,
      color: ticket.seatCategoryColor ?? "",
      showRemainingTickets: ticket.showRemainingTickets,
      // Withheld counts are dropped here rather than passed on, so a category the organizer kept private cannot
      // be read back off the rendered legend.
      remainingSeats: ticket.showRemainingTickets ? getTicketRemaining(ticket) : null,
    }))
}

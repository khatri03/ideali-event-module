import { useQuery } from "@tanstack/react-query"
import { fetchEventTicketView } from "@/api/eventTickets"

/**
 * Loads one issued ticket for its public page. The PDF renderer captures this page once the network
 * goes idle, so a single request that carries the QR with it is what keeps the render deterministic.
 */
export function useEventTicketView(ticketUniqueId: string | undefined) {
  return useQuery({
    queryKey: ["event-ticket", ticketUniqueId],
    queryFn: () => {
      if (!ticketUniqueId) {
        throw new Error("Ticket id is required.")
      }

      return fetchEventTicketView(ticketUniqueId)
    },
    enabled: !!ticketUniqueId,
    retry: 1,
  })
}

import { useQuery } from "@tanstack/react-query"
import { fetchEventSeating, fetchEventSessionSeating } from "@/api/eventSeating"

interface UseEventSeatingOptions {
  /** Event the session belongs to, which is how the chart is read before a cart exists. */
  eventUniqueId: string
  /** Cart the seats are held for, or null before one has been opened. */
  cartUniqueId: string | null
  /** Session whose chart is being drawn, or null while no seated session is open. */
  sessionUniqueId: string | null
}

/**
 * The seat map for one session: what the chart is drawn from, what each category costs, and the token seats are
 * held under once there is a cart to hold them in.
 *
 * Reading the map is all this does. Taking and giving up seats belongs to the selection the buyer is building
 * across the whole form, which outlives any one chart and starts before the cart does.
 */
export function useEventSeating({ eventUniqueId, cartUniqueId, sessionUniqueId }: UseEventSeatingOptions) {
  // Before a cart exists the chart is read from the event, which answers with the same shape minus the hold token
  // and the held seats. That is what lets a buyer pick seats without first having to identify themselves - the two
  // reads are separate cache entries because one is a cart's view and the other is nobody's.
  const seatingQuery = useQuery({
    queryKey: ["event-seating", cartUniqueId ?? eventUniqueId, sessionUniqueId],
    queryFn: () =>
      cartUniqueId
        ? fetchEventSeating(cartUniqueId, sessionUniqueId!)
        : fetchEventSessionSeating(eventUniqueId, sessionUniqueId!),
    enabled: Boolean(sessionUniqueId),
    // The hold token and the seats already taken are read once per session view: refetching under the buyer would
    // redraw the chart they are mid-way through picking on.
    staleTime: Infinity,
  })

  return {
    seatingMap: seatingQuery.data ?? null,
    isLoading: seatingQuery.isLoading,
    isFetching: seatingQuery.isFetching,
    isError: seatingQuery.isError,
    error: seatingQuery.error,
    // The map is never stale on its own, but the hold token it carries expires. Whoever opens the chart asks for a
    // fresh one first, because a seat picked against a dead token is refused with nothing on screen to explain it.
    refreshSeating: seatingQuery.refetch,
  }
}

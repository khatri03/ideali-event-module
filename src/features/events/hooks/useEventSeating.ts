import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchEventSeating, holdEventSeat, releaseEventSeat } from "@/api/eventSeating"
import type { EventCart } from "@/features/events/schemas/eventCart.schemas"
import { extractApiError } from "@/utils/errors"

interface UseEventSeatingOptions {
  /** Cart the seats are held for, or null before one has been opened. */
  cartUniqueId: string | null
  /** Session whose chart is being drawn, or null while no seated session is open. */
  sessionUniqueId: string | null
  /** Called with the basket after a seat was taken or given up, so the caller can show the new total. */
  onCartChanged: (cart: EventCart) => void
  /** Called with a plain-language reason when a seat could not be taken or given up. */
  onSeatRefused: (message: string) => void
}

/**
 * The seat map for one session of a cart, and the two things a buyer can do to a seat on it.
 *
 * The map is a query because it is what the chart is drawn from; holding and releasing are mutations because each
 * one changes what everybody else can buy. Every answer carries the basket back, so the totals on screen and the
 * seats on the chart can never drift apart.
 */
export function useEventSeating({
  cartUniqueId,
  sessionUniqueId,
  onCartChanged,
  onSeatRefused,
}: UseEventSeatingOptions) {
  const queryClient = useQueryClient()
  const isEnabled = Boolean(cartUniqueId && sessionUniqueId)

  const seatingQuery = useQuery({
    queryKey: ["event-seating", cartUniqueId, sessionUniqueId],
    queryFn: () => fetchEventSeating(cartUniqueId!, sessionUniqueId!),
    enabled: isEnabled,
    // The hold token and the seats already taken are read once per session view: refetching under the buyer would
    // redraw the chart they are mid-way through picking on.
    staleTime: Infinity,
  })

  const holdSeat = useMutation({
    mutationFn: (objectLabel: string) =>
      holdEventSeat(cartUniqueId!, { sessionUniqueId: sessionUniqueId!, objectLabel }),
    onSuccess: (cart) => {
      onCartChanged(cart)
      void queryClient.invalidateQueries({ queryKey: ["event-seating", cartUniqueId, sessionUniqueId] })
    },
    onError: (error) => onSeatRefused(extractApiError(error)),
  })

  const releaseSeat = useMutation({
    mutationFn: (objectLabel: string) =>
      releaseEventSeat(cartUniqueId!, { sessionUniqueId: sessionUniqueId!, objectLabel }),
    onSuccess: (cart) => {
      onCartChanged(cart)
      void queryClient.invalidateQueries({ queryKey: ["event-seating", cartUniqueId, sessionUniqueId] })
    },
    onError: (error) => onSeatRefused(extractApiError(error)),
  })

  return {
    seatingMap: seatingQuery.data ?? null,
    isLoading: seatingQuery.isLoading,
    isError: seatingQuery.isError,
    error: seatingQuery.error,
    isSeatChanging: holdSeat.isPending || releaseSeat.isPending,
    holdSeat: holdSeat.mutate,
    releaseSeat: releaseSeat.mutate,
  }
}

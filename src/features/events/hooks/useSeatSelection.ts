import { useCallback, useMemo, useRef, useState } from "react"
import { holdEventSeat, releaseEventSeat } from "@/api/eventSeating"
import type { EventCart } from "@/features/events/schemas/eventCart.schemas"
import { extractApiError } from "@/utils/errors"

/** One seat the buyer has picked, carrying what it costs and which ticket type it is sold as. */
export interface SeatPick {
  sessionUniqueId: string
  objectLabel: string
  categoryKey: string
  ticketTypeUniqueId: string
  ticketTypeName: string
  price: number
}

interface UseSeatSelectionOptions {
  /** Cart the seats are held in, or null while the buyer has not identified themselves yet. */
  cartUniqueId: string | null
  /** Opens the cart on demand, so a seat-only order still has one to be held against. */
  ensureCart: () => Promise<EventCart | null>
  /** Called with the basket every time the server has taken or given up a seat. */
  onCartChanged: (cart: EventCart) => void
}

function seatKey(sessionUniqueId: string, objectLabel: string): string {
  return `${sessionUniqueId}:${objectLabel}`
}

/**
 * The seats the buyer has picked, across every session of one registration form.
 *
 * A seat is picked long before there is a cart to hold it in: the buyer chooses seats on the sessions step and only
 * gives their name and email on the next one. Picks made before then are kept here and claimed the moment the cart
 * opens, which is the same bargain the quantity tickets already make. Until that claim goes through a picked seat is
 * the buyer's intention, not their property, so a seat lost in between is taken off the selection and said out loud
 * rather than carried silently into the checkout.
 */
export function useSeatSelection({ cartUniqueId, ensureCart, onCartChanged }: UseSeatSelectionOptions) {
  const [seats, setSeats] = useState<SeatPick[]>([])
  const [refusalBySession, setRefusalBySession] = useState<Record<string, string>>({})
  const [pendingCount, setPendingCount] = useState(0)

  /** Seats the server has confirmed a hold on. A pick outside this set is still only local. */
  const heldKeysRef = useRef<Set<string>>(new Set())
  const seatsRef = useRef<SeatPick[]>([])

  // The next selection is computed off the ref rather than inside the state updater, so two picks - or two reads of
  // the same cart - landing in one render still see each other. A seat added twice is a seat charged twice.
  const applySeats = useCallback((update: (current: SeatPick[]) => SeatPick[]) => {
    const next = update(seatsRef.current)
    seatsRef.current = next
    setSeats(next)
  }, [])

  const clearRefusal = useCallback((sessionUniqueId: string) => {
    setRefusalBySession((current) => {
      if (!current[sessionUniqueId]) {
        return current
      }

      return Object.fromEntries(Object.entries(current).filter(([key]) => key !== sessionUniqueId))
    })
  }, [])

  const reportRefusal = useCallback((sessionUniqueId: string, message: string) => {
    setRefusalBySession((current) => ({ ...current, [sessionUniqueId]: message }))
  }, [])

  /** Claims one already-picked seat, and drops it from the selection when somebody else got there first. */
  const claimSeat = useCallback(
    async (targetCartUniqueId: string, pick: SeatPick) => {
      const key = seatKey(pick.sessionUniqueId, pick.objectLabel)

      try {
        const cart = await holdEventSeat(targetCartUniqueId, {
          sessionUniqueId: pick.sessionUniqueId,
          objectLabel: pick.objectLabel,
        })

        heldKeysRef.current.add(key)
        onCartChanged(cart)
      } catch (error) {
        applySeats((current) => current.filter((seat) => seatKey(seat.sessionUniqueId, seat.objectLabel) !== key))
        reportRefusal(pick.sessionUniqueId, extractApiError(error))
      }
    },
    [applySeats, onCartChanged, reportRefusal],
  )

  const runExclusively = useCallback(async (work: () => Promise<void>) => {
    setPendingCount((count) => count + 1)

    try {
      await work()
    } finally {
      setPendingCount((count) => count - 1)
    }
  }, [])

  const pickSeat = useCallback(
    (pick: SeatPick) => {
      const key = seatKey(pick.sessionUniqueId, pick.objectLabel)

      if (seatsRef.current.some((seat) => seatKey(seat.sessionUniqueId, seat.objectLabel) === key)) {
        return
      }

      clearRefusal(pick.sessionUniqueId)
      applySeats((current) => [...current, pick])

      if (!cartUniqueId) {
        return
      }

      void runExclusively(() => claimSeat(cartUniqueId, pick))
    },
    [applySeats, cartUniqueId, claimSeat, clearRefusal, runExclusively],
  )

  /** Hands one held seat back, and puts it on the selection again when the server refuses to take it. */
  const releaseSeat = useCallback(
    async (targetCartUniqueId: string, pick: SeatPick) => {
      const key = seatKey(pick.sessionUniqueId, pick.objectLabel)

      try {
        const cart = await releaseEventSeat(targetCartUniqueId, {
          sessionUniqueId: pick.sessionUniqueId,
          objectLabel: pick.objectLabel,
        })

        heldKeysRef.current.delete(key)
        onCartChanged(cart)
      } catch (error) {
        applySeats((current) => [...current, pick])
        reportRefusal(pick.sessionUniqueId, extractApiError(error))
      }
    },
    [applySeats, onCartChanged, reportRefusal],
  )

  /**
   * Gives up seats on one session, whether that is a single seat or every seat at a table.
   *
   * Seats already gone are released one at a time rather than together: each answer carries the whole basket, and
   * two in flight would let the older one overwrite the newer. Seats nothing is holding are given up by forgetting
   * them, because asking the server to release one it never took answers with a refusal the buyer cannot act on.
   */
  const unpickSeats = useCallback(
    (sessionUniqueId: string, objectLabels: string[]) => {
      const keys = new Set(objectLabels.map((objectLabel) => seatKey(sessionUniqueId, objectLabel)))
      const removed = seatsRef.current.filter((seat) => keys.has(seatKey(seat.sessionUniqueId, seat.objectLabel)))

      if (removed.length === 0) {
        return
      }

      clearRefusal(sessionUniqueId)
      applySeats((current) => current.filter((seat) => !keys.has(seatKey(seat.sessionUniqueId, seat.objectLabel))))

      const held = removed.filter((seat) => heldKeysRef.current.has(seatKey(seat.sessionUniqueId, seat.objectLabel)))

      if (!cartUniqueId || held.length === 0) {
        return
      }

      void runExclusively(async () => {
        for (const pick of held) {
          await releaseSeat(cartUniqueId, pick)
        }
      })
    },
    [applySeats, cartUniqueId, clearRefusal, releaseSeat, runExclusively],
  )

  /**
   * Claims every seat picked before the cart existed.
   *
   * Seats are claimed one at a time rather than together: each answer carries the whole basket, and two in flight
   * would let the older one overwrite the newer. A refusal stops nothing — the remaining seats are still worth
   * claiming, and the buyer is told which one they lost.
   */
  const claimPendingSeats = useCallback(async () => {
    const pending = seatsRef.current.filter(
      (seat) => !heldKeysRef.current.has(seatKey(seat.sessionUniqueId, seat.objectLabel)),
    )

    if (pending.length === 0) {
      return
    }

    const cart = await ensureCart()
    if (!cart) {
      return
    }

    await runExclusively(async () => {
      for (const pick of pending) {
        await claimSeat(cart.cartUniqueId, pick)
      }
    })
  }, [claimSeat, ensureCart, runExclusively])

  /**
   * Takes over the seats the server says this cart is already holding.
   *
   * A cart survives a refresh, and the seats it holds come back with the map rather than with anything this browser
   * remembers. Without adopting them the buyer sees an empty card over a cart that is still holding — and paying
   * for — real seats. Seats already known are left alone, so this can run on every read of the map.
   */
  const adoptHeldSeats = useCallback(
    (sessionUniqueId: string, held: SeatPick[]) => {
      const isUnknown = (pick: SeatPick) =>
        !seatsRef.current.some(
          (seat) => seatKey(seat.sessionUniqueId, seat.objectLabel) === seatKey(sessionUniqueId, pick.objectLabel),
        )

      for (const pick of held) {
        heldKeysRef.current.add(seatKey(sessionUniqueId, pick.objectLabel))
      }

      const adopted = held.filter(isUnknown)
      if (adopted.length === 0) {
        return
      }

      applySeats((current) => [...current, ...adopted])
    },
    [applySeats],
  )

  const seatsBySession = useMemo(
    () =>
      seats.reduce<Record<string, SeatPick[]>>((grouped, seat) => {
        grouped[seat.sessionUniqueId] = [...(grouped[seat.sessionUniqueId] ?? []), seat]
        return grouped
      }, {}),
    [seats],
  )

  // Seats are sold as ticket types, so the rest of the form counts them the way it counts any other ticket: the
  // visible tabs, the order summary and the attendee slots all read one quantity map.
  const seatQuantitiesByTicketType = useMemo(
    () =>
      seats.reduce<Record<string, number>>((quantities, seat) => {
        quantities[seat.ticketTypeUniqueId] = (quantities[seat.ticketTypeUniqueId] ?? 0) + 1
        return quantities
      }, {}),
    [seats],
  )

  // Sorted by label, because that is the order the server lists a reservation's seats in, and the attendee typed
  // against the second slot has to be the one sitting in the second seat.
  const seatLabelsByTicketType = useMemo(
    () =>
      Object.entries(
        seats.reduce<Record<string, string[]>>((labels, seat) => {
          labels[seat.ticketTypeUniqueId] = [...(labels[seat.ticketTypeUniqueId] ?? []), seat.objectLabel]
          return labels
        }, {}),
      ).reduce<Record<string, string[]>>((sorted, [ticketTypeUniqueId, labels]) => {
        sorted[ticketTypeUniqueId] = [...labels].sort((left, right) => left.localeCompare(right))
        return sorted
      }, {}),
    [seats],
  )

  return {
    seatsBySession,
    seatQuantitiesByTicketType,
    seatLabelsByTicketType,
    refusalBySession,
    isSeatChanging: pendingCount > 0,
    pickSeat,
    unpickSeats,
    adoptHeldSeats,
    claimPendingSeats,
  }
}

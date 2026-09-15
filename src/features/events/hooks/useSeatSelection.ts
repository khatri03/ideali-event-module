import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  extendHoldToken,
  holdEventSeat,
  issueSessionHoldToken,
  releaseEventSeat,
  releaseSessionSeats,
} from "@/api/eventSeating"
import type { EventCart } from "@/features/events/schemas/eventCart.schemas"
import { readStoredHoldToken, storeHoldToken } from "@/features/events/utils/seatHoldTokenCookie"
import { parseUtcDateTime } from "@/features/events/utils/registrationFormat"
import type { SeatIdentity } from "@/features/events/utils/seatGrouping"
import { extractApiError } from "@/utils/errors"

/**
 * How long before a hold token lapses its renewal is fired. Wide enough to cover a slow round-trip, so the fresh
 * expiry lands before the old one passes and the buyer's seats are never freed between the two.
 */
const HOLD_TOKEN_RENEW_LEAD_MS = 60_000

/** One object the buyer has picked, carrying what it costs and which ticket type it is sold as. */
export interface SeatPick extends SeatIdentity {
  sessionUniqueId: string
  ticketTypeUniqueId: string
  ticketTypeName: string
  price: number
}

interface UseSeatSelectionOptions {
  /** Event the sessions belong to, which is what a hold token is issued against before a cart exists. */
  eventUniqueId: string
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
export function useSeatSelection({
  eventUniqueId,
  cartUniqueId,
  ensureCart,
  onCartChanged,
}: UseSeatSelectionOptions) {
  const [seats, setSeats] = useState<SeatPick[]>([])
  const [refusalBySession, setRefusalBySession] = useState<Record<string, string>>({})
  const [pendingCount, setPendingCount] = useState(0)
  // Seeded from the cookie so the first render already presents the token this browser was holding seats under,
  // rather than asking for a second one and stranding them. Reading it back off the ref during render instead would
  // leave the query key that presents it blind to a token minted without a re-render.
  const [holdToken, setHoldToken] = useState<string | null>(() => readStoredHoldToken(eventUniqueId))
  const [holdTokenExpiresAtUtc, setHoldTokenExpiresAtUtc] = useState<string | null>(null)

  // Read from a ref as well, because a claim in flight was started under whatever token was live when it began, and
  // the ref carries the freshest token into callbacks that a state read would see one render stale.
  const holdTokenRef = useRef<string | null>(holdToken)

  // A token restored from the cookie is the browser's claim, not a fact: only Seats.io knows whether it still holds
  // anything, so it is presented for checking once before it is treated as live.
  const holdTokenCheckedRef = useRef(false)

  /** Seats the server has confirmed a hold on. A pick outside this set is still only local. */
  const heldKeysRef = useRef<Set<string>>(new Set())
  const seatsRef = useRef<SeatPick[]>([])

  // Every cart-seat mutation is threaded through one promise chain, so a claim and a release - or two claims - can
  // never reach the same cart at once and overwrite each other's basket. Each answer carries the whole cart, and the
  // later write has to see the earlier one's result before it computes its own.
  const mutationChainRef = useRef<Promise<void>>(Promise.resolve())

  // Seats a mutation is already in flight for, closed synchronously before the first await so two callers that both
  // read the same seat as unclaimed cannot each send a request for it. A seat charged twice would begin here.
  const inFlightKeysRef = useRef<Set<string>>(new Set())

  /**
   * Runs one cart-seat mutation after every earlier one has settled, and counts it as pending the whole time.
   *
   * The pending count rises the moment the work is queued rather than when it starts, so progression is barred from
   * the instant a mutation is asked for, not only once it reaches the front of the chain. A failure in one mutation
   * neither skips the next nor is swallowed here: the chain steps past it so later work still runs, while the caller
   * still sees the rejection to reconcile its own seat.
   */
  const enqueueMutation = useCallback((work: () => Promise<void>): Promise<void> => {
    setPendingCount((count) => count + 1)

    const settled = mutationChainRef.current.catch(() => undefined).then(work)
    mutationChainRef.current = settled.catch(() => undefined)
    void settled.catch(() => undefined).finally(() => setPendingCount((count) => count - 1))

    return settled
  }, [])

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

  /**
   * Claims one already-picked seat, and drops it from the selection when somebody else got there first.
   *
   * A seat already held, or one a claim is already in flight for, is left alone: the chart confirmed its Seats.io hold
   * before this ran, so a second cart-seat request would only insert a duplicate row and give another chance for a
   * status race. The in-flight key is closed before the first await and cleared once the request settles, so the guard
   * holds across the round-trip rather than only within this tick.
   */
  const claimSeat = useCallback(
    async (targetCartUniqueId: string, pick: SeatPick) => {
      const key = seatKey(pick.sessionUniqueId, pick.objectLabel)

      if (heldKeysRef.current.has(key) || inFlightKeysRef.current.has(key)) {
        return
      }

      inFlightKeysRef.current.add(key)

      try {
        const cart = await holdEventSeat(targetCartUniqueId, {
          sessionUniqueId: pick.sessionUniqueId,
          objectLabel: pick.objectLabel,
          // The cart takes this token over the first time it is offered one, so the seats picked on the chart
          // before the buyer had a cart stay held rather than being handed back the moment it opens.
          holdToken: holdTokenRef.current ?? undefined,
        })

        heldKeysRef.current.add(key)
        onCartChanged(cart)
      } catch (error) {
        applySeats((current) => current.filter((seat) => seatKey(seat.sessionUniqueId, seat.objectLabel) !== key))
        reportRefusal(pick.sessionUniqueId, extractApiError(error))
      } finally {
        inFlightKeysRef.current.delete(key)
      }
    },
    [applySeats, onCartChanged, reportRefusal],
  )

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

      void enqueueMutation(() => claimSeat(cartUniqueId, pick))
    },
    [applySeats, cartUniqueId, claimSeat, clearRefusal, enqueueMutation],
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
   * Hands back seats the chart is holding under this browser's own token, before any cart exists.
   *
   * Every seat picked on the chart is held at Seats.io under the token it was drawn with, and the chart selects
   * those seats again the next time it is opened under that token. So a seat dropped from the basket has to be
   * given back to Seats.io, or the buyer removes it, reopens the map and finds it picked again. They all go in one
   * call because there is no basket coming back to be overwritten.
   */
  const releasePickedSeats = useCallback(
    async (sessionUniqueId: string, presentedHoldToken: string, removed: SeatPick[]) => {
      try {
        await releaseSessionSeats(eventUniqueId, sessionUniqueId, {
          holdToken: presentedHoldToken,
          objectLabels: removed.map((seat) => seat.objectLabel),
        })

        for (const seat of removed) {
          heldKeysRef.current.delete(seatKey(seat.sessionUniqueId, seat.objectLabel))
        }
      } catch (error) {
        applySeats((current) => [...current, ...removed])
        reportRefusal(sessionUniqueId, extractApiError(error))
      }
    },
    [applySeats, eventUniqueId, reportRefusal],
  )

  /**
   * Gives up seats on one session, whether that is a single seat or every seat at a table.
   *
   * Seats already gone are released one at a time rather than together: each answer carries the whole basket, and
   * two in flight would let the older one overwrite the newer. Seats nothing is holding are given up by forgetting
   * them, because asking the server to release one it never took answers with a refusal the buyer cannot act on.
   *
   * Before a cart exists the seats are held at Seats.io under this browser's token instead, so they are handed back
   * there. Only a token this browser never obtained means nothing is holding them and nothing needs saying.
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

      if (!cartUniqueId) {
        const presentedHoldToken = holdTokenRef.current

        if (!presentedHoldToken) {
          return
        }

        void enqueueMutation(() => releasePickedSeats(sessionUniqueId, presentedHoldToken, removed))
        return
      }

      const held = removed.filter((seat) => heldKeysRef.current.has(seatKey(seat.sessionUniqueId, seat.objectLabel)))

      if (held.length === 0) {
        return
      }

      void enqueueMutation(async () => {
        for (const pick of held) {
          await releaseSeat(cartUniqueId, pick)
        }
      })
    },
    [applySeats, cartUniqueId, clearRefusal, enqueueMutation, releasePickedSeats, releaseSeat],
  )

  /**
   * Forgets every seat this browser is holding, without asking the server to release them.
   *
   * For the one case where the cart itself is being walked away from: the buyer emptied their whole registration,
   * so there is no cart left to release seats against. The holds lapse on their own deadline and the seats go back
   * on sale then, exactly as they do for a buyer who closes the tab. Giving up individual seats always goes
   * through `unpickSeats` instead, which does tell the server.
   */
  const forgetSeats = useCallback(() => {
    heldKeysRef.current = new Set()
    applySeats(() => [])
    setRefusalBySession({})
  }, [applySeats])

  /**
   * Claims every seat picked before the cart existed.
   *
   * Seats are claimed one at a time rather than together: each answer carries the whole basket, and two in flight
   * would let the older one overwrite the newer. A refusal stops nothing — the remaining seats are still worth
   * claiming, and the buyer is told which one they lost.
   */
  const claimPendingSeats = useCallback(async () => {
    const hasUnclaimed = seatsRef.current.some(
      (seat) => !heldKeysRef.current.has(seatKey(seat.sessionUniqueId, seat.objectLabel)),
    )

    if (!hasUnclaimed) {
      return
    }

    const cart = await ensureCart()
    if (!cart) {
      return
    }

    // The set of seats still to claim is read inside the queue, not before entering it: a second call that re-enters
    // while this one is in flight - React Strict Mode, or the buyer-info effect firing again - recomputes against the
    // seats the earlier claims have by then marked held, so each seat is asked for once however many callers arrive.
    await enqueueMutation(async () => {
      const pending = seatsRef.current.filter(
        (seat) =>
          !heldKeysRef.current.has(seatKey(seat.sessionUniqueId, seat.objectLabel)) &&
          !inFlightKeysRef.current.has(seatKey(seat.sessionUniqueId, seat.objectLabel)),
      )

      for (const pick of pending) {
        await claimSeat(cart.cartUniqueId, pick)
      }
    })
  }, [claimSeat, ensureCart, enqueueMutation])

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

  /**
   * Issues the token this browser holds seats under while there is no cart, and keeps it for the rest of the form.
   *
   * The buyer picks seats a step before they give the name a cart needs, so without a token of their own the chart
   * would let them pick seats nothing was holding. One token covers every session on the form, because Seats.io
   * issues it per buyer rather than per chart.
   */
  const ensureHoldToken = useCallback(
    async (sessionUniqueId: string): Promise<string | null> => {
      if (holdTokenRef.current && holdTokenCheckedRef.current) {
        return holdTokenRef.current
      }

      try {
        const issued = await issueSessionHoldToken(eventUniqueId, sessionUniqueId, holdTokenRef.current)

        holdTokenRef.current = issued.holdToken
        holdTokenCheckedRef.current = true
        setHoldToken(issued.holdToken)
        setHoldTokenExpiresAtUtc(issued.expiresAtUtc)
        storeHoldToken(eventUniqueId, issued.holdToken, issued.expiresAtUtc)

        return issued.holdToken
      } catch (error) {
        // Said out loud rather than swallowed: a chart drawn with no token looks exactly like one that works, and
        // the buyer would find out at the first seat they picked.
        reportRefusal(sessionUniqueId, extractApiError(error))
        return null
      }
    },
    [eventUniqueId, reportRefusal],
  )

  /**
   * Pushes the current token's expiry out, keeping the very same token and every seat it holds.
   *
   * Seats.io does not renew a manual-session token as the buyer works, so one issued when the chart opened lapses on
   * its own clock and frees the seats the buyer is still looking at. Extending it - never releasing and re-taking -
   * keeps those seats theirs without racing another buyer for them.
   */
  const renewHoldToken = useCallback(async () => {
    const token = holdTokenRef.current
    if (!token) {
      return
    }

    try {
      const extended = await extendHoldToken(eventUniqueId, token)
      holdTokenRef.current = extended.holdToken
      holdTokenCheckedRef.current = true
      setHoldToken(extended.holdToken)
      setHoldTokenExpiresAtUtc(extended.expiresAtUtc)
      storeHoldToken(eventUniqueId, extended.holdToken, extended.expiresAtUtc)
    } catch {
      // The token could not be extended: it has already lapsed and its seats are back on sale. Nothing is forced
      // over a token that is gone - reissueHoldToken mints a fresh one when the chart reports the expiry.
    }
  }, [eventUniqueId])

  /**
   * Mints a fresh token after the old one lapsed, so the chart can hold again instead of refusing every pick.
   *
   * The chart reports its token expiring, at which point its seats are already back on sale. A fresh token holds
   * nothing, but it is what lets the buyer pick again in place, rather than being sent to reload the whole page.
   */
  const reissueHoldToken = useCallback(
    async (sessionUniqueId: string): Promise<string | null> => {
      try {
        const issued = await issueSessionHoldToken(eventUniqueId, sessionUniqueId, null)

        holdTokenRef.current = issued.holdToken
        holdTokenCheckedRef.current = true
        setHoldToken(issued.holdToken)
        setHoldTokenExpiresAtUtc(issued.expiresAtUtc)
        storeHoldToken(eventUniqueId, issued.holdToken, issued.expiresAtUtc)

        return issued.holdToken
      } catch (error) {
        reportRefusal(sessionUniqueId, extractApiError(error))
        return null
      }
    },
    [eventUniqueId, reportRefusal],
  )

  // The token is kept alive only while there is no cart. Once a cart exists it holds the token to the buyer's own
  // payment deadline, and the visible purchase countdown is the cap; renewing past it would hold seats the buyer no
  // longer has time to pay for. Before then the token lapses on its own fifteen-minute clock with no countdown to
  // warn a lingering buyer, so it is extended a step ahead of that here.
  useEffect(() => {
    if (cartUniqueId || !holdToken || !holdTokenExpiresAtUtc) {
      return
    }

    const expiresAt = parseUtcDateTime(holdTokenExpiresAtUtc)?.getTime()
    if (expiresAt == null) {
      return
    }

    const delay = Math.max(expiresAt - Date.now() - HOLD_TOKEN_RENEW_LEAD_MS, 0)
    const timer = window.setTimeout(() => {
      void renewHoldToken()
    }, delay)

    return () => window.clearTimeout(timer)
  }, [cartUniqueId, holdToken, holdTokenExpiresAtUtc, renewHoldToken])

  /**
   * Takes over every seat the cart came back holding, after a refresh emptied this browser's memory of them.
   *
   * The cart is what actually holds seats, and it says so on its own lines. Reading them back from the chart
   * instead would only work for a session the buyer happens to have expanded, so a buyer who refreshed with two
   * sessions on the form saw an empty basket over seats they were still being charged for.
   */
  const adoptCartSeats = useCallback(
    (cart: EventCart) => {
      for (const line of cart.lines) {
        if (line.seats.length === 0) {
          continue
        }

        adoptHeldSeats(
          line.sessionUniqueId,
          line.seats.map((seat) => ({
            sessionUniqueId: line.sessionUniqueId,
            objectLabel: seat.objectLabel,
            objectType: seat.objectType,
            ticketTypeUniqueId: line.ticketTypeUniqueId,
            ticketTypeName: line.ticketTypeName,
            price: line.unitPrice,
          })),
        )
      }
    },
    [adoptHeldSeats],
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
  const seatsByTicketType = useMemo(
    () =>
      Object.entries(
        seats.reduce<Record<string, SeatIdentity[]>>((grouped, seat) => {
          grouped[seat.ticketTypeUniqueId] = [
            ...(grouped[seat.ticketTypeUniqueId] ?? []),
            { objectLabel: seat.objectLabel, objectType: seat.objectType },
          ]
          return grouped
        }, {}),
      ).reduce<Record<string, SeatIdentity[]>>((sorted, [ticketTypeUniqueId, picked]) => {
        sorted[ticketTypeUniqueId] = [...picked].sort((left, right) =>
          left.objectLabel.localeCompare(right.objectLabel),
        )
        return sorted
      }, {}),
    [seats],
  )

  return {
    holdToken,
    // What the cart is offered when it reads the map. The token restored from the cookie counts here even before it
    // has been checked - the state is seeded with it - because the cart settles with Seats.io whether it still holds
    // anything, and offering the one this browser last used is what stops a second token being minted over seats the
    // first one is holding.
    presentedHoldToken: holdToken,
    holdTokenExpiresAtUtc,
    ensureHoldToken,
    reissueHoldToken,
    reportRefusal,
    seatsBySession,
    seatQuantitiesByTicketType,
    seatsByTicketType,
    refusalBySession,
    isSeatChanging: pendingCount > 0,
    pickSeat,
    unpickSeats,
    forgetSeats,
    adoptHeldSeats,
    adoptCartSeats,
    claimPendingSeats,
  }
}

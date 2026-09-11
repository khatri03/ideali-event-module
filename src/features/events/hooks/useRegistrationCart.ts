import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addEventCartLine, createEventCart, fetchEventCart, priceEventCart, removeEventCartLine } from "@/api/eventCheckout"
import type { EventCart, EventCartPrice } from "@/features/events/schemas/eventCart.schemas"
import { clearStoredCartId, readStoredCartId, storeCartId } from "@/features/events/utils/registrationCartCookie"
import { parseUtcDateTime } from "@/features/events/utils/registrationFormat"
import { extractApiError, isCartSessionLostError } from "@/utils/errors"

interface TicketSelectionInput {
  sessionUniqueId: string
  ticketTypeUniqueId: string
  quantity: number
}

interface RegistrationCartState {
  cart: EventCart | null
  price: EventCartPrice | null
  /** Only ever the code the server actually priced, so the chip cannot claim a rejected one. */
  appliedCouponCode: string | null
  isSyncing: boolean
  error: string | null
  /** The server no longer accepts this cart. Nothing can be retried against it. */
  isSessionLost: boolean
}

const EMPTY_STATE: RegistrationCartState = {
  cart: null,
  price: null,
  appliedCouponCode: null,
  isSyncing: false,
  error: null,
  isSessionLost: false,
}

/**
 * The server refuses every capability failure the same way, so it cannot say which one happened. The
 * buyer is told the only thing that is both true and useful.
 */
const SESSION_LOST_MESSAGE = "This registration session is no longer available. Start again from the event page."

/**
 * A cart is only worth resuming while it still holds stock. The cart itself carries no status, so
 * the line reservations are the signal: `Confirmed` means it was already paid for, `Expired` and
 * `Cancelled` mean the hold is gone.
 */
function isCartResumable(cart: EventCart, eventUniqueId: string): boolean {
  if (cart.eventUniqueId !== eventUniqueId) {
    return false
  }

  const deadline = parseUtcDateTime(cart.expiresAtUtc)
  if (deadline && deadline.getTime() <= Date.now()) {
    return false
  }

  return cart.lines.some((line) => line.reservationStatus === "Active")
}

/**
 * Owns the server cart for one registration session: opens it anonymously the moment the buyer picks
 * anything, reconciles their ticket choices against the cart's lines, and re-prices after every change.
 * Totals, charges and the purchase deadline all come from the server.
 *
 * The cart carries no buyer while the buyer is still choosing - who the order is addressed to is stated
 * at checkout, and the server enforces it there. Opening the cart on the first selection is what makes
 * every choice a durable server line, so a refresh resumes it from the cart rather than losing it.
 *
 * Mutations are serialized through a promise chain because each one returns the whole cart; running
 * two concurrently would let a stale response overwrite a newer one.
 *
 * The cart id is mirrored into a cookie so a refresh resumes the same server cart instead of
 * abandoning it - an orphaned cart keeps holding stock the buyer can no longer reach or release.
 */
export function useRegistrationCart(eventUniqueId: string) {
  const [state, setState] = useState<RegistrationCartState>(EMPTY_STATE)
  const [restoredCart, setRestoredCart] = useState<EventCart | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const cartRef = useRef<EventCart | null>(null)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const couponCodeRef = useRef<string | null>(null)

  const restoreAttemptedRef = useRef(false)

  const applyCart = useCallback((cart: EventCart) => {
    cartRef.current = cart

    // Every cart response lands here, so the cookie always carries the current deadline. Only a
    // cart holding stock is worth remembering though: an empty one has nothing to resume, and
    // pointing at it would strand the buyer behind a cookie that restore is bound to reject.
    if (cart.lines.length > 0) {
      storeCartId(cart.cartUniqueId, cart.expiresAtUtc)
    } else {
      clearStoredCartId()
    }

    setState((current) => ({ ...current, cart }))
  }, [])

  const ensureCart = useCallback(async (): Promise<EventCart> => {
    if (cartRef.current) {
      return cartRef.current
    }

    // Opened anonymously: the buyer identifies themselves at checkout, not here. That is what lets any
    // selection - a seat or a general-admission quantity - become a server line the moment it is made, so
    // a refresh resumes it from the cart instead of losing it with the browser's memory.
    const created = await createEventCart({ eventUniqueId })
    applyCart(created)
    return created
  }, [applyCart, eventUniqueId])

  const repriceCart = useCallback(async (cartUniqueId: string) => {
    const price = await priceEventCart(cartUniqueId, { couponCode: couponCodeRef.current })
    setState((current) => ({ ...current, price }))
  }, [])

  /**
   * Applies a cart a seat hold or release answered with, then reprices it. A seat line changes the basket
   * exactly as a general-admission line does, and the total, discount and payment charges the summary and
   * payment steps read all come from the priced cart - so a seat added or dropped without a reprice leaves that
   * total showing what the basket cost before the seat. A reprice that fails is reported through the same error
   * as a quantity change's; the seat itself is already on the cart and stays there.
   */
  const adoptCartAndReprice = useCallback(
    (cart: EventCart) => {
      applyCart(cart)
      void repriceCart(cart.cartUniqueId).catch((error) => {
        setState((current) => ({ ...current, error: extractApiError(error) }))
      })
    },
    [applyCart, repriceCart],
  )

  /** Reconciles one ticket type against the cart. The server enforces min/max and availability. */
  const applySelection = useCallback(
    async (selection: TicketSelectionInput) => {
      const cart = await ensureCart()

      const existingLine = cart.lines.find((line) => line.ticketTypeUniqueId === selection.ticketTypeUniqueId)
      if (existingLine && existingLine.quantity === selection.quantity) {
        return
      }

      let nextCart = cart

      if (existingLine) {
        nextCart = await removeEventCartLine(cart.cartUniqueId, existingLine.lineUniqueId)
        applyCart(nextCart)
      }

      if (selection.quantity > 0) {
        nextCart = await addEventCartLine(nextCart.cartUniqueId, {
          sessionUniqueId: selection.sessionUniqueId,
          ticketTypeUniqueId: selection.ticketTypeUniqueId,
          quantity: selection.quantity,
        })
        applyCart(nextCart)
      }

      await repriceCart(nextCart.cartUniqueId)
    },
    [applyCart, ensureCart, repriceCart],
  )

  /** Everything tying this browser to a server cart. Kept apart from the visible state so a failure can
   * drop the cart without deciding what the buyer is told. */
  const forgetCart = useCallback(() => {
    cartRef.current = null
    couponCodeRef.current = null
    clearStoredCartId()
    setRestoredCart(null)
    setIsCompleted(false)
  }, [])

  const enqueue = useCallback((work: () => Promise<void>) => {
    const run = async () => {
      setState((current) => ({ ...current, isSyncing: true, error: null }))

      try {
        await work()
      } catch (error) {
        // A refused capability ends the cart. Holding on to it would leave every later call failing the
        // same way, with the buyer retrying against a cart the server will never accept again.
        if (isCartSessionLostError(error)) {
          forgetCart()
          setState({ ...EMPTY_STATE, error: SESSION_LOST_MESSAGE, isSessionLost: true })
          return
        }

        setState((current) => ({ ...current, error: extractApiError(error) }))
      } finally {
        setState((current) => ({ ...current, isSyncing: false }))
      }
    }

    queueRef.current = queueRef.current.then(run, run)
    return queueRef.current
  }, [forgetCart])

  const syncTicketSelection = useCallback(
    (selection: TicketSelectionInput) => enqueue(() => applySelection(selection)),
    [applySelection, enqueue],
  )

  /**
   * Opens the cart without adding anything to it.
   *
   * Seats are held through their own endpoint, so an order made entirely of seats never reaches `applySelection`
   * and would otherwise have no cart to be held against. Runs through the same queue as every other mutation, so
   * it cannot race a selection already in flight.
   */
  const ensureCartNow = useCallback(() => {
    let opened: EventCart | null = null

    return enqueue(async () => {
      opened = await ensureCart()
    }).then(() => opened)
  }, [ensureCart, enqueue])

  /**
   * Resumes the cart left behind by a refresh. Runs through the same queue as every other mutation
   * so a selection made while the fetch is in flight cannot overwrite it. Failures are swallowed on
   * purpose: a buyer arriving with a dead cookie should get a clean form, not an error banner.
   */
  useEffect(() => {
    if (restoreAttemptedRef.current) {
      return
    }

    restoreAttemptedRef.current = true

    const storedCartId = readStoredCartId()
    if (!storedCartId) {
      return
    }

    void enqueue(async () => {
      try {
        const cart = await fetchEventCart(storedCartId)

        if (!isCartResumable(cart, eventUniqueId)) {
          clearStoredCartId()
          return
        }

        applyCart(cart)
        await repriceCart(cart.cartUniqueId)
        setRestoredCart(cart)
      } catch {
        clearStoredCartId()
      }
    })
  }, [applyCart, enqueue, eventUniqueId, repriceCart])

  const applyCoupon = useCallback(
    (couponCode: string | null) => {
      const nextCode = couponCode?.trim() || null
      const previousCode = couponCodeRef.current
      couponCodeRef.current = nextCode

      return enqueue(async () => {
        const cart = cartRef.current

        if (cart) {
          try {
            await repriceCart(cart.cartUniqueId)
          } catch (error) {
            // The code rides on every later reprice, so a rejected one left in place would fail the
            // next quantity change too - and the pricing transaction rolled back, so the cart still
            // holds whatever it had before.
            couponCodeRef.current = previousCode
            throw error
          }
        }

        setState((current) => ({ ...current, appliedCouponCode: nextCode }))
      })
    },
    [enqueue, repriceCart],
  )

  const resetCart = useCallback(() => {
    forgetCart()
    setState(EMPTY_STATE)
  }, [forgetCart])

  /**
   * Drops the stored id once the purchase has gone through. The in-memory cart stays so the buyer
   * keeps seeing what they bought, but a reload must never resume a cart that is already paid for,
   * and the hold deadline stops applying the moment the money moves - a paid order cannot expire.
   */
  const completeCart = useCallback(() => {
    clearStoredCartId()
    setIsCompleted(true)
  }, [])

  const lineByTicketTypeId = useMemo(() => {
    const lines = state.cart?.lines ?? []
    return lines.reduce<Record<string, string>>((map, line) => {
      map[line.ticketTypeUniqueId] = line.lineUniqueId
      return map
    }, {})
  }, [state.cart])

  return {
    cart: state.cart,
    price: state.price,
    appliedCouponCode: state.appliedCouponCode,
    isSyncing: state.isSyncing,
    error: state.error,
    /** The cart is gone for good. The wizard must send the buyer back to the start, not offer a retry. */
    isSessionLost: state.isSessionLost,
    /** Absolute UTC deadline the hold expires at, or null once paid. The UI only counts down to it. */
    expiresAtUtc: isCompleted ? null : state.cart?.expiresAtUtc ?? null,
    lineByTicketTypeId,
    /** Set once when a cart survived a refresh, so the wizard can rebuild its selection from it. */
    restoredCart,
    syncTicketSelection,
    /** Opens the cart on demand, for seats that are held outside the ticket-quantity path. */
    ensureCartNow,
    /**
     * Adopts a cart the server answered with elsewhere, without repricing - used to restore a cart that survived a
     * refresh, whose price the wizard fetches for itself. A seat hold or release goes through `adoptCartAndReprice`
     * instead, so its total is refreshed.
     */
    applyCart,
    /** Adopts the cart a seat hold or release answered with and reprices it, so the summary total follows the seat. */
    adoptCartAndReprice,
    applyCoupon,
    resetCart,
    completeCart,
  }
}

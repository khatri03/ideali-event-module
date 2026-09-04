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

export interface BuyerIdentity {
  name: string
  email: string
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

function hasIdentity(identity: BuyerIdentity | null): identity is BuyerIdentity {
  return Boolean(identity && identity.name.trim() && identity.email.trim())
}

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
 * Owns the server cart for one registration session: creates it once the buyer has identified
 * themselves, reconciles their ticket choices against the cart's lines, and re-prices after every
 * change. Totals, charges and the purchase deadline all come from the server.
 *
 * The wizard collects tickets before buyer details, but the server refuses to open a cart without a
 * buyer name and email. Selections made before then are buffered and flushed the moment the buyer
 * identifies themselves, so the buyer can browse and pick without hitting a wall.
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
  const identityRef = useRef<BuyerIdentity | null>(null)
  /** Selections made before the buyer identified themselves, keyed by ticket type. */
  const pendingRef = useRef<Map<string, TicketSelectionInput>>(new Map())

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

  const ensureCart = useCallback(async (): Promise<EventCart | null> => {
    if (cartRef.current) {
      return cartRef.current
    }

    const identity = identityRef.current
    if (!hasIdentity(identity)) {
      return null
    }

    const created = await createEventCart({
      eventUniqueId,
      buyerName: identity.name.trim(),
      buyerEmail: identity.email.trim(),
    })
    applyCart(created)
    return created
  }, [applyCart, eventUniqueId])

  const repriceCart = useCallback(async (cartUniqueId: string) => {
    const price = await priceEventCart(cartUniqueId, { couponCode: couponCodeRef.current })
    setState((current) => ({ ...current, price }))
  }, [])

  /** Reconciles one ticket type against the cart. The server enforces min/max and availability. */
  const applySelection = useCallback(
    async (selection: TicketSelectionInput) => {
      const cart = await ensureCart()
      if (!cart) {
        // No buyer yet - remember the intent and replay it once the cart can be opened.
        pendingRef.current.set(selection.ticketTypeUniqueId, selection)
        return
      }

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
    identityRef.current = null
    pendingRef.current.clear()
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

  /**
   * Records who is buying. Once name and email are both present the cart is opened and any
   * selections made beforehand are replayed against it.
   */
  const setBuyerIdentity = useCallback(
    (identity: BuyerIdentity) => {
      const wasIdentified = hasIdentity(identityRef.current)
      identityRef.current = identity

      if (wasIdentified || !hasIdentity(identity) || pendingRef.current.size === 0) {
        return Promise.resolve()
      }

      const pending = Array.from(pendingRef.current.values())
      pendingRef.current.clear()

      return enqueue(async () => {
        for (const selection of pending) {
          await applySelection(selection)
        }
      })
    },
    [applySelection, enqueue],
  )

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
    setBuyerIdentity,
    /**
     * Adopts a cart the server answered with elsewhere - seat selection holds a seat through its own endpoint and
     * gets the whole basket back, so the totals and the stored deadline follow it here rather than being refetched.
     */
    applyCart,
    applyCoupon,
    resetCart,
    completeCart,
  }
}

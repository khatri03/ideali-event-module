import { useCallback, useMemo, useRef, useState } from "react"
import { addEventCartLine, createEventCart, priceEventCart, removeEventCartLine } from "@/api/eventCheckout"
import type { EventCart, EventCartPrice } from "@/features/events/schemas/eventCart.schemas"
import { extractApiError } from "@/utils/errors"

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
  isSyncing: boolean
  error: string | null
}

const EMPTY_STATE: RegistrationCartState = {
  cart: null,
  price: null,
  isSyncing: false,
  error: null,
}

function hasIdentity(identity: BuyerIdentity | null): identity is BuyerIdentity {
  return Boolean(identity && identity.name.trim() && identity.email.trim())
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
 */
export function useRegistrationCart(eventUniqueId: string) {
  const [state, setState] = useState<RegistrationCartState>(EMPTY_STATE)
  const cartRef = useRef<EventCart | null>(null)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const couponCodeRef = useRef<string | null>(null)
  const identityRef = useRef<BuyerIdentity | null>(null)
  /** Selections made before the buyer identified themselves, keyed by ticket type. */
  const pendingRef = useRef<Map<string, TicketSelectionInput>>(new Map())

  const applyCart = useCallback((cart: EventCart) => {
    cartRef.current = cart
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

  const enqueue = useCallback((work: () => Promise<void>) => {
    const run = async () => {
      setState((current) => ({ ...current, isSyncing: true, error: null }))

      try {
        await work()
      } catch (error) {
        setState((current) => ({ ...current, error: extractApiError(error) }))
      } finally {
        setState((current) => ({ ...current, isSyncing: false }))
      }
    }

    queueRef.current = queueRef.current.then(run, run)
    return queueRef.current
  }, [])

  const syncTicketSelection = useCallback(
    (selection: TicketSelectionInput) => enqueue(() => applySelection(selection)),
    [applySelection, enqueue],
  )

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
      couponCodeRef.current = couponCode?.trim() || null

      return enqueue(async () => {
        const cart = cartRef.current
        if (!cart) return
        await repriceCart(cart.cartUniqueId)
      })
    },
    [enqueue, repriceCart],
  )

  const resetCart = useCallback(() => {
    cartRef.current = null
    couponCodeRef.current = null
    identityRef.current = null
    pendingRef.current.clear()
    setState(EMPTY_STATE)
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
    isSyncing: state.isSyncing,
    error: state.error,
    /** Absolute UTC deadline the hold expires at. The UI only counts down to it. */
    expiresAtUtc: state.cart?.expiresAtUtc ?? null,
    lineByTicketTypeId,
    syncTicketSelection,
    setBuyerIdentity,
    applyCoupon,
    resetCart,
  }
}

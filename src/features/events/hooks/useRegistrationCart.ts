import { useCallback, useMemo, useRef, useState } from "react"
import { addEventCartLine, createEventCart, priceEventCart, removeEventCartLine } from "@/api/eventCheckout"
import type { EventCart, EventCartPrice } from "@/features/events/schemas/eventCart.schemas"
import { extractApiError } from "@/utils/errors"

interface TicketSelectionInput {
  sessionUniqueId: string
  ticketTypeUniqueId: string
  quantity: number
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

/**
 * Owns the server cart for one registration session: creates it lazily on the first ticket
 * selection, reconciles the buyer's ticket choices against the cart's lines, and re-prices after
 * every change. Totals, charges and the purchase deadline all come back from the server - nothing
 * here recomputes them.
 *
 * Selection changes are serialized through a promise chain because each mutation returns the whole
 * cart; running two in parallel would let a stale response overwrite a newer one.
 */
export function useRegistrationCart(eventUniqueId: string) {
  const [state, setState] = useState<RegistrationCartState>(EMPTY_STATE)
  const cartRef = useRef<EventCart | null>(null)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const couponCodeRef = useRef<string | null>(null)

  const applyCart = useCallback((cart: EventCart) => {
    cartRef.current = cart
    setState((current) => ({ ...current, cart }))
  }, [])

  const ensureCart = useCallback(async (): Promise<EventCart> => {
    if (cartRef.current) {
      return cartRef.current
    }

    const created = await createEventCart({ eventUniqueId })
    applyCart(created)
    return created
  }, [applyCart, eventUniqueId])

  const repriceCart = useCallback(async (cartUniqueId: string) => {
    const price = await priceEventCart(cartUniqueId, { couponCode: couponCodeRef.current })
    setState((current) => ({ ...current, price }))
  }, [])

  /**
   * Reconciles one ticket type against the cart. The server rejects invalid quantities (min/max,
   * availability), so nothing is pre-validated here - the failure message is surfaced as-is.
   */
  const syncTicketSelection = useCallback(
    (selection: TicketSelectionInput) => {
      const run = async () => {
        setState((current) => ({ ...current, isSyncing: true, error: null }))

        try {
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
        } catch (error) {
          setState((current) => ({ ...current, error: extractApiError(error) }))
        } finally {
          setState((current) => ({ ...current, isSyncing: false }))
        }
      }

      queueRef.current = queueRef.current.then(run, run)
      return queueRef.current
    },
    [applyCart, ensureCart, repriceCart],
  )

  const applyCoupon = useCallback(
    (couponCode: string | null) => {
      couponCodeRef.current = couponCode?.trim() || null

      const run = async () => {
        const cart = cartRef.current
        if (!cart) {
          return
        }

        setState((current) => ({ ...current, isSyncing: true, error: null }))

        try {
          await repriceCart(cart.cartUniqueId)
        } catch (error) {
          setState((current) => ({ ...current, error: extractApiError(error) }))
        } finally {
          setState((current) => ({ ...current, isSyncing: false }))
        }
      }

      queueRef.current = queueRef.current.then(run, run)
      return queueRef.current
    },
    [repriceCart],
  )

  const resetCart = useCallback(() => {
    cartRef.current = null
    couponCodeRef.current = null
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
    applyCoupon,
    resetCart,
  }
}

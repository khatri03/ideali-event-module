import { addMinutes } from "date-fns"
import { deleteCookie, readCookie, writeCookie } from "@/utils/cookies"

const ORDER_COOKIE_NAME = "ideali_event_order"
/** Scoped to the registration and order routes, both of which sit under `/events`. */
const ORDER_COOKIE_PATH = "/events"
/**
 * Long enough to survive a tab that reloads or crashes mid-payment, short enough that a shared
 * machine does not keep pointing the next buyer at somebody else's order.
 */
const HANDOFF_MINUTES = 60

/**
 * Remembers the order a payment is being confirmed against, written before the buyer is handed to
 * Stripe. Without it, a page that reloads between confirm and redirect leaves a paid order with no
 * way back to it - the cart id is gone by then, by design.
 */
export function storePendingOrderId(orderUniqueId: string): void {
  writeCookie(ORDER_COOKIE_NAME, orderUniqueId, {
    path: ORDER_COOKIE_PATH,
    expires: addMinutes(new Date(), HANDOFF_MINUTES),
  })
}

export function readPendingOrderId(): string | null {
  return readCookie(ORDER_COOKIE_NAME)
}

export function clearPendingOrderId(): void {
  deleteCookie(ORDER_COOKIE_NAME, ORDER_COOKIE_PATH)
}

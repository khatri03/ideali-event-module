import { addMinutes } from "date-fns"
import { deleteCookie, readCookie, writeCookie } from "@/utils/cookies"
import { parseUtcDateTime } from "@/features/events/utils/registrationFormat"

const CART_COOKIE_NAME = "ideali_event_cart"
/** Scoped to the registration route, `/events/:eventUniqueId/register`. */
const CART_COOKIE_PATH = "/events"
/**
 * Mirrors the backend's `TicketingService.PaymentGraceMinutes`, so the cookie stops existing at
 * roughly the moment the server stops honouring the cart and stale ids clean themselves up.
 */
const RESERVATION_GRACE_MINUTES = 30

export function readStoredCartId(): string | null {
  return readCookie(CART_COOKIE_NAME)
}

/** Only the cart id is stored; every other detail stays server-side. */
export function storeCartId(cartUniqueId: string, expiresAtUtc: string | null): void {
  const deadline = parseUtcDateTime(expiresAtUtc)

  writeCookie(CART_COOKIE_NAME, cartUniqueId, {
    path: CART_COOKIE_PATH,
    expires: deadline ? addMinutes(deadline, RESERVATION_GRACE_MINUTES) : undefined,
  })
}

export function clearStoredCartId(): void {
  deleteCookie(CART_COOKIE_NAME, CART_COOKIE_PATH)
}

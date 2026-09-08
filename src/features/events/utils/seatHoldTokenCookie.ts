import { deleteCookie, readCookie, writeCookie } from "@/utils/cookies"
import { parseUtcDateTime } from "@/features/events/utils/registrationFormat"

const HOLD_TOKEN_COOKIE_NAME = "ideali_event_hold_token"
/** Scoped to the registration route, `/events/:eventUniqueId/register`, like the cart id beside it. */
const HOLD_TOKEN_COOKIE_PATH = "/events"

/**
 * Reads the token this browser was last holding seats under.
 *
 * The value is the browser's claim and nothing more; only Seats.io can say whether it still holds anything, so it
 * is presented to the server for checking rather than trusted here.
 */
export function readStoredHoldToken(): string | null {
  return readCookie(HOLD_TOKEN_COOKIE_NAME)
}

/**
 * Keeps the token across a reload, so seats picked before the buyer had a cart survive one.
 *
 * Without this a refresh mints a second token, and the seats held under the first are stranded: the buyer cannot
 * buy them because the chart no longer holds them, and nobody else can either until the old token lapses.
 */
export function storeHoldToken(holdToken: string, expiresAtUtc: string | null): void {
  writeCookie(HOLD_TOKEN_COOKIE_NAME, holdToken, {
    path: HOLD_TOKEN_COOKIE_PATH,
    expires: parseUtcDateTime(expiresAtUtc) ?? undefined,
  })
}

export function clearStoredHoldToken(): void {
  deleteCookie(HOLD_TOKEN_COOKIE_NAME, HOLD_TOKEN_COOKIE_PATH)
}

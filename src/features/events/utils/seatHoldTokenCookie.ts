import { deleteCookie, readCookie, writeCookie } from "@/utils/cookies"
import { parseUtcDateTime } from "@/features/events/utils/registrationFormat"

const HOLD_TOKEN_COOKIE_PREFIX = "ideali_event_hold_token_"
/** Scoped to the registration route, `/events/:eventUniqueId/register`, like the cart id beside it. */
const HOLD_TOKEN_COOKIE_PATH = "/events"

/**
 * Names the cookie one event's hold token lives in.
 *
 * The token is keyed by event because Seats.io issues it per workspace, and two events can belong to different
 * organizers with different workspaces. A single shared cookie would hand one event's chart a token minted in
 * another's workspace, which Seats.io refuses on the first pick - the seats look pickable but nothing can be held.
 */
function holdTokenCookieName(eventUniqueId: string): string {
  return `${HOLD_TOKEN_COOKIE_PREFIX}${eventUniqueId}`
}

/**
 * Reads the token this browser was last holding this event's seats under.
 *
 * The value is the browser's claim and nothing more; only Seats.io can say whether it still holds anything, so it
 * is presented to the server for checking rather than trusted here.
 */
export function readStoredHoldToken(eventUniqueId: string): string | null {
  return readCookie(holdTokenCookieName(eventUniqueId))
}

/**
 * Keeps the token across a reload, so seats picked before the buyer had a cart survive one.
 *
 * Without this a refresh mints a second token, and the seats held under the first are stranded: the buyer cannot
 * buy them because the chart no longer holds them, and nobody else can either until the old token lapses.
 */
export function storeHoldToken(eventUniqueId: string, holdToken: string, expiresAtUtc: string | null): void {
  writeCookie(holdTokenCookieName(eventUniqueId), holdToken, {
    path: HOLD_TOKEN_COOKIE_PATH,
    expires: parseUtcDateTime(expiresAtUtc) ?? undefined,
  })
}

export function clearStoredHoldToken(eventUniqueId: string): void {
  deleteCookie(holdTokenCookieName(eventUniqueId), HOLD_TOKEN_COOKIE_PATH)
}

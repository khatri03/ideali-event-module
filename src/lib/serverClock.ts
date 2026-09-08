/**
 * How far this browser's clock sits from the server's, in milliseconds.
 *
 * Zero until an API response has been seen, which is the honest starting point: with nothing to compare against,
 * the browser's own clock is the only reading there is.
 */
let offsetMs = 0

/**
 * Records the gap between the server's clock and this browser's, from the `Date` header of a response.
 *
 * Every deadline the registration form counts down to is issued by the server in UTC, but the countdown runs in
 * the browser. A device whose clock is minutes fast shows a buyer less time than they have and can retire a cart
 * that is still alive; one running slow keeps counting after the seats have gone back on sale.
 */
export function recordServerTime(headerDate: string | undefined): void {
  if (!headerDate) {
    return
  }

  const serverMs = Date.parse(headerDate)
  if (Number.isNaN(serverMs)) {
    return
  }

  offsetMs = serverMs - Date.now()
}

/** The current time as the server would read it, which is what every deadline here is stated against. */
export function serverNow(): number {
  return Date.now() + offsetMs
}

/** Forgets the measured offset. Exists for tests, so one case cannot skew the next. */
export function resetServerClock(): void {
  offsetMs = 0
}

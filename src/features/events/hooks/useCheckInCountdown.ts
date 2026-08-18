import { useEffect, useMemo, useRef, useState } from "react"
import type { AttendeeRoster } from "@/features/events/schemas/eventCheckIn.schemas"
import { parseUtcDateTime } from "@/utils/utcDates"

export type CheckInDoorPhase = "beforeOpen" | "open" | "closed"

export interface CheckInCountdown {
  phase: CheckInDoorPhase
  /** Milliseconds until the phase changes, null when nothing on this side of the window is pending. */
  remainingMs: number | null
  opensAt: Date | null
  closesAt: Date | null
}

const TICK_MS = 1000

/**
 * How long the door screen has, counted off the server's clock rather than the tablet's. A device that
 * is minutes fast would otherwise reach zero while the server still refuses every scan, which is worse
 * than showing no countdown at all: the operator trusts it and turns people away.
 *
 * `onElapsed` fires once each time the clock carries the door into a new phase, so the caller can
 * re-read the roster instead of leaving the screen on a countdown that has run out.
 */
export function useCheckInCountdown(roster: AttendeeRoster | undefined, onElapsed: () => void): CheckInCountdown {
  const clock = useServerClock(roster?.serverTimeUtc)

  const countdown = useMemo(() => resolveCountdown(roster, clock.serverNowMs), [roster, clock.serverNowMs])

  // Keyed on the clock, not the roster: a roster arrives one render before the clock that goes with it,
  // and reading the newer boundaries against the older clock is not the door changing phase.
  useDoorPhaseChange(countdown.phase, clock.readAt, onElapsed)

  return countdown
}

function resolveCountdown(roster: AttendeeRoster | undefined, serverNowMs: number): CheckInCountdown {
  const opensAt = parseUtcDateTime(roster?.checkInOpensAtUtc)
  const closesAt = parseUtcDateTime(roster?.checkInClosesAtUtc)

  if (opensAt && serverNowMs < opensAt.getTime()) {
    return { phase: "beforeOpen", remainingMs: opensAt.getTime() - serverNowMs, opensAt, closesAt }
  }

  if (closesAt && serverNowMs > closesAt.getTime()) {
    return { phase: "closed", remainingMs: null, opensAt, closesAt }
  }

  return {
    phase: "open",
    remainingMs: closesAt ? closesAt.getTime() - serverNowMs : null,
    opensAt,
    closesAt,
  }
}

interface ServerClock {
  /** The roster read this clock was set from, so callers can tell a settled clock from a stale one. */
  readAt: string | undefined
  serverNowMs: number
}

/**
 * The server's clock, advanced locally between roster reads. The offset is taken fresh from every read,
 * so a tablet left running for a whole shift cannot drift away from the clock the scan is judged by.
 */
function useServerClock(serverTimeUtc: string | undefined): ServerClock {
  const [clock, setClock] = useState<ServerClock>(() => ({ readAt: undefined, serverNowMs: Date.now() }))

  useEffect(() => {
    const serverTime = parseUtcDateTime(serverTimeUtc)
    const offsetMs = serverTime ? serverTime.getTime() - Date.now() : 0
    const advance = () => setClock({ readAt: serverTimeUtc, serverNowMs: Date.now() + offsetMs })

    // Primed on its own turn rather than inline, so the first reading of a new roster lands as an
    // ordinary update instead of a second render cascading out of this effect.
    const primer = window.setTimeout(advance, 0)
    const timer = window.setInterval(advance, TICK_MS)

    return () => {
      window.clearTimeout(primer)
      window.clearInterval(timer)
    }
  }, [serverTimeUtc])

  return clock
}

/**
 * Fires when the clock carries the door from one phase to the next. Deliberately silent when the phase
 * moves because a fresh roster arrived: firing there would ask for the roster just fetched, and go on
 * asking for it.
 */
function useDoorPhaseChange(phase: CheckInDoorPhase, readAt: string | undefined, onElapsed: () => void) {
  const previous = useRef<{ readAt: string | undefined; phase: CheckInDoorPhase } | null>(null)

  useEffect(() => {
    const last = previous.current
    previous.current = { readAt, phase }

    if (last && last.readAt === readAt && last.phase !== phase) {
      onElapsed()
    }
  }, [phase, readAt, onElapsed])
}

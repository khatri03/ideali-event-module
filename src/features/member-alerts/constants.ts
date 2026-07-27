import { formatDuration, intervalToDuration, type Duration } from "date-fns"
import type { AlertPriority } from "@/api/alerts"

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]

export const PRIORITY_OPTIONS: { value: AlertPriority; label: string }[] = [
  { value: "Urgent", label: "Urgent" },
  { value: "Important", label: "Important" },
  { value: "Normal", label: "Normal" },
  { value: "Low", label: "Low" },
]

export const PRIORITY_COLOR: Record<AlertPriority, string> = {
  Urgent: "red",
  Important: "orange",
  Normal: "blue",
  Low: "gray",
}

export const STATUS_COLOR: Record<string, string> = {
  Draft: "gray",
  Scheduled: "purple",
  Sending: "blue",
  Sent: "green",
  PartiallyFailed: "orange",
  Failed: "red",
  Cancelled: "gray",
}

/**
 * Reverses formatDateTime's parse for the datetime-local input: that input holds a timezone-less local
 * wall-clock string, so a stored UTC instant must be rendered back using local getters (not UTC ones) to
 * reopen the picker showing the same moment the organizer originally chose.
 */
export function toLocalDateTimeInputValue(isoUtc: string): string {
  const date = new Date(isoUtc)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "—"
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

/** Largest-to-smallest so the top two non-zero units are always the most meaningful pair to show. */
const COUNTDOWN_UNIT_ORDER: (keyof Duration)[] = ["years", "months", "weeks", "days", "hours", "minutes"]

/**
 * A raw UTC timestamp means nothing to an organizer at a glance - "in 1 hour 23 minutes" does. Shows the
 * two most significant non-zero units (date-fns rounds down to whole units, so this never overstates how
 * soon a send is).
 */
export function formatCountdown(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) {
    return "Sending shortly"
  }

  const duration = intervalToDuration({ start: now, end: target })
  const significantUnits = COUNTDOWN_UNIT_ORDER.filter((unit) => (duration[unit] ?? 0) > 0).slice(0, 2)

  if (significantUnits.length === 0) {
    return "Sending in under a minute"
  }

  return `Will send in ${formatDuration(duration, { format: significantUnits })}`
}

/** Seconds included so a ticking clock visibly changes; used as a live "now" reference next to the picker. */
export function formatCurrentUtc(now: Date): string {
  return `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(now)} UTC`
}

export function channelLabel(mask: number): string {
  const parts: string[] = []
  if (mask & 1) {
    parts.push("Instant")
  }
  if (mask & 2) {
    parts.push("Email")
  }
  return parts.length > 0 ? parts.join(" + ") : "—"
}

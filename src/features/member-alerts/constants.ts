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

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "—"
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
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

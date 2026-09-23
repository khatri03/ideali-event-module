import { format } from "date-fns"
import { STATUS_CHANGE_SORT, type StatusChangeSort } from "@/api/seatsio"

export type StatusChangeSortColumn = "date" | "objectLabel" | "status"

const COLUMN_SORTS: Record<StatusChangeSortColumn, readonly [StatusChangeSort, StatusChangeSort]> = {
  date: [STATUS_CHANGE_SORT.dateDesc, STATUS_CHANGE_SORT.dateAsc],
  objectLabel: [STATUS_CHANGE_SORT.objectLabelAsc, STATUS_CHANGE_SORT.objectLabelDesc],
  status: [STATUS_CHANGE_SORT.statusAsc, STATUS_CHANGE_SORT.statusDesc],
}

/** A first click sorts the column in its natural direction; a click on the already-sorted column reverses it. */
export function nextStatusChangeSort(current: StatusChangeSort, column: StatusChangeSortColumn): StatusChangeSort {
  const [first, second] = COLUMN_SORTS[column]
  return current === first ? second : first
}

export function sortDirectionFor(
  current: StatusChangeSort,
  column: StatusChangeSortColumn,
): "ascending" | "descending" | "none" {
  if (!COLUMN_SORTS[column].includes(current)) {
    return "none"
  }
  return current.endsWith("Asc") ? "ascending" : "descending"
}

function toValidDate(dateUtc: string | null): Date | null {
  if (!dateUtc) {
    return null
  }

  const parsed = new Date(dateUtc)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** The day a change happened, shown in its own column so date and time read apart, as the Seats.io portal shows them. */
export function formatStatusChangeDate(dateUtc: string | null): string {
  const parsed = toValidDate(dateUtc)
  return parsed ? format(parsed, "d MMM yyyy") : "—"
}

export interface StatusChangeTimeParts {
  /** Wall-clock time to the second, e.g. "16:23:07". */
  clock: string
  /** The fractional second with its dot, e.g. ".592", muted in the UI to echo the Seats.io portal. */
  fraction: string
}

/**
 * The time of a change split into its second and millisecond parts. Milliseconds matter because several changes to one
 * seat land inside the same second; splitting them lets the UI mute the fraction. Null for a missing or unreadable time.
 */
export function formatStatusChangeTimeParts(dateUtc: string | null): StatusChangeTimeParts | null {
  const parsed = toValidDate(dateUtc)
  return parsed ? { clock: format(parsed, "HH:mm:ss"), fraction: format(parsed, ".SSS") } : null
}

export function statusChangePalette(status: string): string {
  if (status === "booked") return "green"
  if (status === "free") return "gray"
  if (status === "reservedByToken") return "orange"
  return "purple"
}

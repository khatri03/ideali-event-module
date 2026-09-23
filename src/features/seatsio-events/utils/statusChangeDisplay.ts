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

export function formatStatusChangeTime(dateUtc: string | null): string {
  if (!dateUtc) {
    return "—"
  }

  const parsed = new Date(dateUtc)
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "d MMM yyyy HH:mm:ss.SSS")
}

export function statusChangePalette(status: string): string {
  if (status === "booked") return "green"
  if (status === "free") return "gray"
  if (status === "reservedByToken") return "orange"
  return "purple"
}

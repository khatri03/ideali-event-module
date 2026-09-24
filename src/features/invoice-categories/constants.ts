import { format } from "date-fns"
import { parseUtcDateTime } from "@/utils/utcDates"
import { EMPTY_VALUE } from "@/utils/format"

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/components/common"

/** Renders a stored UTC instant as the list's created date, or a dash when it is missing or unparseable. */
export function formatDate(value: string): string {
  const parsed = parseUtcDateTime(value)
  return parsed ? format(parsed, "MMM d, yyyy") : EMPTY_VALUE
}

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchEventInvoiceCategories,
  type EventInvoiceCategoryFilters,
} from "@/api/eventInvoiceCategories"

export const EVENT_INVOICE_CATEGORY_QUERY_KEY = ["organizer", "invoice-categories"] as const

export function useEventInvoiceCategories(
  filters: EventInvoiceCategoryFilters,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: [...EVENT_INVOICE_CATEGORY_QUERY_KEY, "list", filters, page, pageSize],
    queryFn: () => fetchEventInvoiceCategories(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

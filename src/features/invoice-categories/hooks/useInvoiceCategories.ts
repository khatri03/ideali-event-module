import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchInvoiceCategories,
  type InvoiceCategoryFilters,
} from "@/api/invoiceCategories"

export const INVOICE_CATEGORY_QUERY_KEY = ["organizer", "invoice-categories"] as const

export function useInvoiceCategories(
  filters: InvoiceCategoryFilters,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: [...INVOICE_CATEGORY_QUERY_KEY, "list", filters, page, pageSize],
    queryFn: () => fetchInvoiceCategories(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchEventInvoiceDetail,
  fetchEventInvoiceFilterOptions,
  fetchEventInvoices,
  type EventInvoiceFilters,
  type EventInvoiceSortBy,
  type EventInvoiceSortOrder,
} from "@/api/eventInvoices"

export function useEventInvoices(
  filters: EventInvoiceFilters,
  page: number,
  pageSize: number,
  sortBy: EventInvoiceSortBy,
  sortOrder: EventInvoiceSortOrder,
) {
  return useQuery({
    queryKey: ["event-invoices", filters, page, pageSize, sortBy, sortOrder],
    queryFn: () => fetchEventInvoices(filters, page, pageSize, sortBy, sortOrder),
    placeholderData: keepPreviousData,
  })
}

export function useEventInvoiceFilterOptions() {
  return useQuery({
    queryKey: ["event-invoice-filter-options"],
    queryFn: fetchEventInvoiceFilterOptions,
  })
}

export function useEventInvoiceDetail(invoiceUniqueId: string | undefined) {
  return useQuery({
    queryKey: ["event-invoice-detail", invoiceUniqueId],
    queryFn: () => fetchEventInvoiceDetail(invoiceUniqueId!),
    enabled: Boolean(invoiceUniqueId),
  })
}

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchCustomInvoiceList,
  fetchCustomInvoiceListFilterOptions,
  type CustomInvoiceListQuery,
} from "@/api/customInvoices"

export function useCustomInvoiceList(query: CustomInvoiceListQuery) {
  return useQuery({
    queryKey: ["custom-invoices", "list", query],
    queryFn: () => fetchCustomInvoiceList(query),
    placeholderData: keepPreviousData,
    // A buyer can settle from the pay page while the organizer is away, so a revisit asks the server.
    refetchOnMount: "always",
  })
}

export function useCustomInvoiceListFilterOptions() {
  return useQuery({
    queryKey: ["custom-invoices", "filter-options"],
    queryFn: fetchCustomInvoiceListFilterOptions,
  })
}

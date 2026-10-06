import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import {
  fetchCustomInvoiceEntityOptions,
  fetchEnabledCustomInvoiceModules,
  type CustomInvoiceModule,
} from "@/api/customInvoices"

/** The modules custom invoicing is turned on for; the module control offers nothing else. */
export function useEnabledCustomInvoiceModules() {
  return useQuery({
    queryKey: ["organizer", "custom-invoices", "enabled-modules"],
    queryFn: fetchEnabledCustomInvoiceModules,
  })
}

/**
 * The organizer's records in a module, searched and paged on the server. Each Load more asks for the next
 * page only; it stays idle until a module is chosen, since there is nothing to search before that.
 */
export function useCustomInvoiceEntityOptions(moduleType: CustomInvoiceModule | undefined, searchTerm: string) {
  const term = searchTerm.trim()
  return useInfiniteQuery({
    queryKey: ["organizer", "custom-invoices", "entity-options", moduleType, term],
    queryFn: ({ pageParam }) =>
      fetchCustomInvoiceEntityOptions({ moduleType: moduleType as CustomInvoiceModule, searchTerm: term, pageNo: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.pageNo < lastPage.pageCount ? lastPage.pageNo + 1 : undefined),
    enabled: Boolean(moduleType),
    placeholderData: keepPreviousData,
  })
}

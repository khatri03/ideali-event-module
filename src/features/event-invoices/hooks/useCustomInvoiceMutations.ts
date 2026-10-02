import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import {
  createCustomInvoice,
  fetchActiveInvoiceCategoryOptions,
  updateCustomInvoice,
  type CustomInvoiceWritePayload,
} from "@/api/customInvoices"
import { fetchCustomListMemberOptions } from "@/api/customLists"
import { toaster } from "@/lib/toaster"
import { extractApiError } from "@/utils/errors"

/** The active sponsorship types a new custom invoice can be billed under. */
export function useActiveInvoiceCategoryOptions() {
  return useQuery({
    queryKey: ["invoice-category-options"],
    queryFn: fetchActiveInvoiceCategoryOptions,
  })
}

/**
 * Members matching the buyer search, reusing the membership member-options endpoint. It stays idle until
 * the organizer has typed enough to narrow the list, so opening the picker does not fire a blank query.
 */
export function useCustomInvoiceBuyerMemberOptions(searchTerm: string) {
  const term = searchTerm.trim()
  return useQuery({
    queryKey: ["organizer", "custom-invoices", "buyer-member-options", term],
    queryFn: () => fetchCustomListMemberOptions(term, [], "fullName", "asc", 1, 20),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

function refreshAfterWrite(queryClient: QueryClient, invoiceUniqueId: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ["event-invoices"] })
  if (invoiceUniqueId) {
    queryClient.invalidateQueries({ queryKey: ["custom-invoice-detail", invoiceUniqueId] })
    queryClient.invalidateQueries({ queryKey: ["organizer", "custom-invoices", "edit", invoiceUniqueId] })
  }
}

/**
 * Authors a custom invoice. On success it toasts and refreshes the invoices list; the page owns navigation
 * so it can route to the created invoice, and reads this mutation's error for its own banner.
 */
export function useCreateCustomInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomInvoice,
    onSuccess: () => toaster.create({ type: "success", title: "Custom invoice created." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: (createdInvoiceUniqueId) => refreshAfterWrite(queryClient, createdInvoiceUniqueId),
  })
}

/**
 * Applies edits to an existing custom invoice. Like the create mutation the page owns navigation, so this
 * only reports the outcome and refreshes; the entered values stay on the page when the server rejects.
 */
export function useUpdateCustomInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceUniqueId, payload }: { invoiceUniqueId: string; payload: CustomInvoiceWritePayload }) =>
      updateCustomInvoice(invoiceUniqueId, payload),
    onSuccess: () => toaster.create({ type: "success", title: "Custom invoice updated." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: (_result, _error, { invoiceUniqueId }) => refreshAfterWrite(queryClient, invoiceUniqueId),
  })
}

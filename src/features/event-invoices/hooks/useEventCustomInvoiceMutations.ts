import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createEventCustomInvoice,
  fetchActiveEventInvoiceCategoryOptions,
  updateEventCustomInvoice,
  type CreateEventCustomInvoicePayload,
  type UpdateEventCustomInvoicePayload,
} from "@/api/eventInvoices"
import { fetchCustomListMemberOptions } from "@/api/customLists"
import { toaster } from "@/lib/toaster"
import { extractApiError } from "@/utils/errors"

/** The active sponsorship types a new custom invoice can be billed under. */
export function useActiveEventInvoiceCategoryOptions() {
  return useQuery({
    queryKey: ["event-invoice-category-options"],
    queryFn: fetchActiveEventInvoiceCategoryOptions,
  })
}

/**
 * Members matching the buyer search, reusing the membership member-options endpoint. It stays idle until
 * the organizer has typed enough to narrow the list, so opening the picker does not fire a blank query.
 */
export function useEventInvoiceBuyerMemberOptions(searchTerm: string) {
  const term = searchTerm.trim()
  return useQuery({
    queryKey: ["organizer", "event-invoices", "buyer-member-options", term],
    queryFn: () => fetchCustomListMemberOptions(term, [], "fullName", "asc", 1, 20),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

/**
 * Authors a custom invoice. On success it toasts and refreshes the invoices list; the page owns navigation
 * so it can route to the created invoice, and reads this mutation's error for its own banner.
 */
export function useCreateEventCustomInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateEventCustomInvoicePayload) => createEventCustomInvoice(payload),
    onSuccess: () => toaster.create({ type: "success", title: "Custom invoice created." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["event-invoices"] }),
  })
}

/**
 * Applies edits to an existing custom invoice. Like the create mutation the page owns navigation, so this
 * only reports the outcome and refreshes the list; the entered values stay on the page when the server rejects.
 */
export function useUpdateEventCustomInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceUniqueId,
      payload,
    }: {
      invoiceUniqueId: string
      payload: UpdateEventCustomInvoicePayload
    }) => updateEventCustomInvoice(invoiceUniqueId, payload),
    onSuccess: () => toaster.create({ type: "success", title: "Custom invoice updated." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["event-invoices"] }),
  })
}

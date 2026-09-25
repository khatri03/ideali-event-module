import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createEventCustomInvoice,
  fetchActiveEventInvoiceCategoryOptions,
  type CreateEventCustomInvoicePayload,
} from "@/api/eventInvoices"
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

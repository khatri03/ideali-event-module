import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchEventInvoiceDetail,
  fetchEventInvoiceFilterOptions,
  fetchEventInvoices,
  resendEventInvoice,
  resendEventInvoiceTicket,
  type EventInvoiceFilters,
  type EventInvoiceSortBy,
  type EventInvoiceSortOrder,
} from "@/api/eventInvoices"
import { toaster } from "@/lib/toaster"
import { extractApiError } from "@/utils/errors"

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
    // Payment status flips from checkout and Stripe webhooks while the organizer is on the page, so
    // coming back to the list always asks the server. The global staleTime would otherwise serve a
    // two-minute-old view of who has paid.
    refetchOnMount: "always",
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
    refetchOnMount: "always",
  })
}

export function useResendEventInvoice(invoiceUniqueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => resendEventInvoice(invoiceUniqueId),
    onSuccess: () => toaster.create({ type: "success", title: "Tickets queued for resend." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["event-invoice-detail", invoiceUniqueId] }),
  })
}

export function useResendEventInvoiceTicket(invoiceUniqueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ticketUniqueId: string) => resendEventInvoiceTicket(invoiceUniqueId, ticketUniqueId),
    onSuccess: () => toaster.create({ type: "success", title: "Ticket queued for resend." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["event-invoice-detail", invoiceUniqueId] }),
  })
}

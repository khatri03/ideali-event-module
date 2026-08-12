import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addEventInvoiceNote,
  cancelEventInvoice,
  fetchEventInvoiceDetail,
  fetchEventInvoiceFilterOptions,
  fetchEventInvoices,
  markEventInvoiceAsPaid,
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

/**
 * Both settlement actions change the invoice's status, its notes and its place in the list, so each
 * one refreshes the detail it was launched from and the list behind it.
 */
function useInvoiceSettlementAction(
  invoiceUniqueId: string,
  action: (invoiceUniqueId: string) => Promise<void>,
  successTitle: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => action(invoiceUniqueId),
    onSuccess: () => toaster.create({ type: "success", title: successTitle }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["event-invoice-detail", invoiceUniqueId] })
      queryClient.invalidateQueries({ queryKey: ["event-invoices"] })
    },
  })
}

export function useMarkEventInvoiceAsPaid(invoiceUniqueId: string) {
  return useInvoiceSettlementAction(invoiceUniqueId, markEventInvoiceAsPaid, "Invoice marked as paid.")
}

export function useCancelEventInvoice(invoiceUniqueId: string) {
  return useInvoiceSettlementAction(invoiceUniqueId, cancelEventInvoice, "Invoice cancelled.")
}

export function useAddEventInvoiceNote(invoiceUniqueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note: string) => addEventInvoiceNote(invoiceUniqueId, note),
    onSuccess: () => toaster.create({ type: "success", title: "Invoice note added." }),
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

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import {
  addEventInvoiceNote,
  cancelEventInvoice,
  fetchEventInvoiceDetail,
  fetchEventInvoiceFilterOptions,
  fetchEventInvoices,
  linkEventInvoice,
  markEventInvoiceAsPaid,
  resendEventInvoice,
  resendEventInvoiceTicket,
  unlinkEventInvoice,
  updateEventInvoiceBuyer,
  updateEventInvoiceAttendee,
  type EventInvoiceAttendeeUpdate,
  type EventInvoiceBuyerUpdate,
  type EventInvoiceFilters,
  type EventInvoiceLineItem,
  type EventInvoiceSortBy,
  type EventInvoiceSortOrder,
} from "@/api/eventInvoices"
import { toaster } from "@/lib/toaster"
import { extractApiError, isNotFoundError } from "@/utils/errors"

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
    // An invoice the organizer cannot reach will not appear on a second attempt; retrying only delays
    // the message. Anything else gets one more try before the page gives up and offers the button.
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
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
function useInvoiceSettlementAction<TVariables = void>(
  invoiceUniqueId: string,
  action: (variables: TVariables) => Promise<void>,
  successTitle: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: () => toaster.create({ type: "success", title: successTitle }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["event-invoice-detail", invoiceUniqueId] })
      queryClient.invalidateQueries({ queryKey: ["event-invoices"] })
    },
  })
}

export function useMarkEventInvoiceAsPaid(invoiceUniqueId: string) {
  return useInvoiceSettlementAction(invoiceUniqueId, () => markEventInvoiceAsPaid(invoiceUniqueId), "Invoice marked as paid.")
}

export function useCancelEventInvoice(invoiceUniqueId: string) {
  return useInvoiceSettlementAction(
    invoiceUniqueId,
    (cancellationNotes: string) => cancelEventInvoice(invoiceUniqueId, cancellationNotes),
    "Invoice cancelled.",
  )
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

export function useUpdateEventInvoiceBuyer(invoiceUniqueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (buyer: EventInvoiceBuyerUpdate) => updateEventInvoiceBuyer(invoiceUniqueId, buyer),
    onSuccess: () => toaster.create({ type: "success", title: "Buyer details updated." }),
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

/** Resends every ticket on a single line item by looping per-ticket resend calls in parallel. */
export function useResendEventInvoiceLineItem(invoiceUniqueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lineItem: EventInvoiceLineItem) =>
      Promise.all(
        lineItem.tickets.map((ticket) => resendEventInvoiceTicket(invoiceUniqueId, ticket.ticketUniqueId)),
      ).then(() => undefined),
    onSuccess: () => toaster.create({ type: "success", title: "Tickets queued for resend." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["event-invoice-detail", invoiceUniqueId] }),
  })
}

/**
 * A link is written on both invoices, so each side's detail and the list behind them are refreshed -
 * otherwise the other invoice keeps showing the reference it had before.
 */
function invalidateLinkedPair(queryClient: QueryClient, invoiceUniqueIds: string[]) {
  invoiceUniqueIds.forEach((invoiceUniqueId) =>
    queryClient.invalidateQueries({ queryKey: ["event-invoice-detail", invoiceUniqueId] }),
  )
  queryClient.invalidateQueries({ queryKey: ["event-invoices"] })
}

export function useLinkEventInvoice(invoiceUniqueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (targetInvoiceUniqueId: string) => linkEventInvoice(invoiceUniqueId, targetInvoiceUniqueId),
    onSuccess: () => toaster.create({ type: "success", title: "Invoices linked." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: (_result, _error, targetInvoiceUniqueId) =>
      invalidateLinkedPair(queryClient, [invoiceUniqueId, targetInvoiceUniqueId]),
  })
}

export function useUnlinkEventInvoice(invoiceUniqueId: string, linkedInvoiceUniqueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unlinkEventInvoice(invoiceUniqueId),
    onSuccess: () => toaster.create({ type: "success", title: "Link removed." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => invalidateLinkedPair(queryClient, [invoiceUniqueId, linkedInvoiceUniqueId]),
  })
}

export function useUpdateEventInvoiceAttendee(invoiceUniqueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      lineItemUniqueId,
      slotIndex,
      data,
    }: {
      lineItemUniqueId: string
      slotIndex: number
      data: EventInvoiceAttendeeUpdate
    }) => updateEventInvoiceAttendee(invoiceUniqueId, lineItemUniqueId, slotIndex, data),
    onSuccess: () => toaster.create({ type: "success", title: "Attendee updated." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["event-invoice-detail", invoiceUniqueId] }),
  })
}

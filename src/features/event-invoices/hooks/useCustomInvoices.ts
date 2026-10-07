import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import {
  addCustomInvoiceNote,
  cancelCustomInvoice,
  fetchCustomInvoiceDetail,
  linkCustomInvoice,
  markCustomInvoiceAsPaid,
  sendCustomInvoice,
  unlinkCustomInvoice,
} from "@/api/customInvoices"
import { toaster } from "@/lib/toaster"
import { extractApiError, isNotFoundError } from "@/utils/errors"

const detailKey = (invoiceUniqueId: string) => ["custom-invoice-detail", invoiceUniqueId]

/** Every write changes what the detail shows and may change the invoice's row in either list behind it. */
function refreshInvoices(queryClient: QueryClient, invoiceUniqueIds: string[]) {
  invoiceUniqueIds.forEach((invoiceUniqueId) => queryClient.invalidateQueries({ queryKey: detailKey(invoiceUniqueId) }))
  queryClient.invalidateQueries({ queryKey: ["event-invoices"] })
  queryClient.invalidateQueries({ queryKey: ["custom-invoices", "list"] })
}

function useCustomInvoiceAction<TVariables = void>(
  action: (variables: TVariables) => Promise<void>,
  successTitle: string,
  affectedInvoiceIds: (variables: TVariables) => string[],
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: () => toaster.create({ type: "success", title: successTitle }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: (_result, _error, variables) => refreshInvoices(queryClient, affectedInvoiceIds(variables)),
  })
}

export function useCustomInvoiceDetail(invoiceUniqueId: string | undefined) {
  return useQuery({
    queryKey: detailKey(invoiceUniqueId ?? ""),
    queryFn: () => fetchCustomInvoiceDetail(invoiceUniqueId as string),
    enabled: Boolean(invoiceUniqueId),
    // A payment can settle from the buyer's pay page while the organizer is away, so a revisit asks the server.
    refetchOnMount: "always",
    // An invoice the organizer cannot reach will not appear on a second attempt; retrying only delays the message.
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  })
}

export function useMarkCustomInvoiceAsPaid(invoiceUniqueId: string) {
  return useCustomInvoiceAction(() => markCustomInvoiceAsPaid(invoiceUniqueId), "Invoice marked as paid.", () => [
    invoiceUniqueId,
  ])
}

export function useCancelCustomInvoice(invoiceUniqueId: string) {
  return useCustomInvoiceAction(
    (cancellationNotes: string) => cancelCustomInvoice(invoiceUniqueId, cancellationNotes),
    "Invoice cancelled.",
    () => [invoiceUniqueId],
  )
}

export function useEmailCustomInvoice(invoiceUniqueId: string) {
  return useCustomInvoiceAction(() => sendCustomInvoice(invoiceUniqueId), "Invoice emailed to the buyer.", () => [
    invoiceUniqueId,
  ])
}

export function useAddCustomInvoiceNote(invoiceUniqueId: string) {
  return useCustomInvoiceAction(
    (note: string) => addCustomInvoiceNote(invoiceUniqueId, note),
    "Invoice note added.",
    () => [invoiceUniqueId],
  )
}

/** The mutations a custom invoice's detail page hands to its action controls. */
export function useCustomInvoiceDetailActions(invoiceUniqueId: string) {
  return {
    markPaid: useMarkCustomInvoiceAsPaid(invoiceUniqueId),
    cancel: useCancelCustomInvoice(invoiceUniqueId),
    emailInvoice: useEmailCustomInvoice(invoiceUniqueId),
    addNote: useAddCustomInvoiceNote(invoiceUniqueId),
  }
}

/** A link is written on both invoices, so both details refresh - otherwise the other side keeps its old reference. */
export function useLinkCustomInvoice(invoiceUniqueId: string) {
  return useCustomInvoiceAction(
    (targetInvoiceUniqueId: string) => linkCustomInvoice(invoiceUniqueId, targetInvoiceUniqueId),
    "Invoices linked.",
    (targetInvoiceUniqueId) => [invoiceUniqueId, targetInvoiceUniqueId],
  )
}

export function useUnlinkCustomInvoice(invoiceUniqueId: string, linkedInvoiceUniqueId: string) {
  return useCustomInvoiceAction(() => unlinkCustomInvoice(invoiceUniqueId), "Link removed.", () => [
    invoiceUniqueId,
    linkedInvoiceUniqueId,
  ])
}

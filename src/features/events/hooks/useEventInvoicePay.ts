import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchEventInvoicePaySummary, startEventInvoicePayment } from "@/api/eventInvoicePayment"

const eventInvoicePayKey = (invoiceUniqueId: string) => ["event-invoice-pay", invoiceUniqueId]

/** An unknown invoice resolves to null rather than failing, so it is shown as "not found" and never retried. */
export function useEventInvoicePaySummary(invoiceUniqueId: string) {
  return useQuery({
    queryKey: eventInvoicePayKey(invoiceUniqueId),
    queryFn: () => fetchEventInvoicePaySummary(invoiceUniqueId),
    enabled: Boolean(invoiceUniqueId),
  })
}

/** No toasts: the pay form reports every outcome inline, next to the card the buyer is correcting. */
export function useStartEventInvoicePayment(invoiceUniqueId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => startEventInvoicePayment(invoiceUniqueId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: eventInvoicePayKey(invoiceUniqueId) }),
  })
}

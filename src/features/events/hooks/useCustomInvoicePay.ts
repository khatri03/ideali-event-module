import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchCustomInvoicePaySummary, startCustomInvoicePayment } from "@/api/customInvoicePayment"

const customInvoicePayKey = (invoiceUniqueId: string) => ["custom-invoice-pay", invoiceUniqueId]

/** An unknown invoice resolves to null rather than failing, so it is shown as "not found" and never retried. */
export function useCustomInvoicePaySummary(invoiceUniqueId: string) {
  return useQuery({
    queryKey: customInvoicePayKey(invoiceUniqueId),
    queryFn: () => fetchCustomInvoicePaySummary(invoiceUniqueId),
    enabled: Boolean(invoiceUniqueId),
  })
}

/** No toasts: the pay form reports every outcome inline, next to the card the buyer is correcting. */
export function useStartCustomInvoicePayment(invoiceUniqueId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => startCustomInvoicePayment(invoiceUniqueId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: customInvoicePayKey(invoiceUniqueId) }),
  })
}

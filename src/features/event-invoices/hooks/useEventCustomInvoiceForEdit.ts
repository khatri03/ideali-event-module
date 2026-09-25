import { useQuery } from "@tanstack/react-query"
import { fetchEventCustomInvoiceForEdit } from "@/api/eventInvoices"

/**
 * Loads an existing custom invoice into its editable shape. Idle in create mode - it runs only once the
 * route names an invoice to edit, so the create page never fires a get for a non-existent id.
 */
export function useEventCustomInvoiceForEdit(invoiceUniqueId: string | undefined) {
  return useQuery({
    queryKey: ["organizer", "event-invoices", "custom", "edit", invoiceUniqueId],
    queryFn: () => fetchEventCustomInvoiceForEdit(invoiceUniqueId as string),
    enabled: Boolean(invoiceUniqueId),
    retry: false,
    refetchOnWindowFocus: false,
  })
}

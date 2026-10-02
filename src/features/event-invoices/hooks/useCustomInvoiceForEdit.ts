import { useQuery } from "@tanstack/react-query"
import { fetchCustomInvoiceForEdit } from "@/api/customInvoices"

/**
 * Loads an existing custom invoice into its editable shape. Idle in create mode - it runs only once the
 * route names an invoice to edit, so the create page never fires a get for a non-existent id.
 */
export function useCustomInvoiceForEdit(invoiceUniqueId: string | undefined) {
  return useQuery({
    queryKey: ["organizer", "custom-invoices", "edit", invoiceUniqueId],
    queryFn: () => fetchCustomInvoiceForEdit(invoiceUniqueId as string),
    enabled: Boolean(invoiceUniqueId),
    retry: false,
    refetchOnWindowFocus: false,
  })
}

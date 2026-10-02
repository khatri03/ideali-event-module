import { Navigate, useParams } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"

/**
 * Pay links emailed before the custom-invoices rename point at /events/invoices/{id}/pay. The id is encoded
 * so an edited link can only ever land on a pay page, never on another in-app path.
 */
export function LegacyCustomInvoicePayRedirect() {
  const { invoiceUniqueId = "" } = useParams<{ invoiceUniqueId: string }>()
  return <Navigate to={APP_ROUTES.customInvoicePay(encodeURIComponent(invoiceUniqueId))} replace />
}

import { useNavigate } from "react-router-dom"
import type { CustomInvoiceListItem } from "@/api/customInvoices"
import { APP_ROUTES } from "@/utils/routes"
import { useCustomInvoiceDetailActions } from "../hooks/useCustomInvoices"
import { useInvoiceListReturnState } from "../hooks/useInvoiceListReturnState"
import { InvoiceSettlementActions } from "./InvoiceSettlementActions"

/** A list row's actions, each offered only when the server allows it on that invoice. */
export function CustomInvoiceRowActions({ invoice }: { invoice: CustomInvoiceListItem }) {
  const navigate = useNavigate()
  const returnState = useInvoiceListReturnState()
  const { markPaid, cancel, emailInvoice } = useCustomInvoiceDetailActions(invoice.invoiceUniqueId)

  return (
    <InvoiceSettlementActions
      variant="menu"
      invoiceNo={invoice.invoiceNo}
      canMarkAsPaid={invoice.canMarkAsPaid}
      canCancel={invoice.canCancel}
      canEmailInvoice={invoice.canSend}
      buyerEmail={invoice.buyerEmail}
      markPaid={markPaid}
      cancel={cancel}
      emailInvoice={emailInvoice}
      onView={() => navigate(APP_ROUTES.customInvoices.detail(invoice.invoiceUniqueId), { state: returnState })}
    />
  )
}

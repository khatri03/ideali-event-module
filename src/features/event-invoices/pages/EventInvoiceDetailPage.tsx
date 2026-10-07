import { useParams } from "react-router-dom"
import { Stack } from "@chakra-ui/react"
import { isNotFoundError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import {
  useAddEventInvoiceNote,
  useCancelEventInvoice,
  useEventInvoiceDetail,
  useMarkEventInvoiceAsPaid,
  useResendEventInvoice,
} from "../hooks/useEventInvoices"
import { useBackToInvoiceList } from "../hooks/useInvoiceListReturnState"
import { EventInvoiceDetailHeader } from "../components/EventInvoiceDetailHeader"
import { EventInvoiceMoneyPanel } from "../components/EventInvoiceMoneyPanel"
import { InvoiceDetailFallback } from "../components/InvoiceDetailFallback"
import { InvoiceNotesSection } from "../components/InvoiceNotesSection"
import { InvoiceSettlementActions } from "../components/InvoiceSettlementActions"
import { EventInvoiceLineItemsSection } from "../components/EventInvoiceLineItemsSection"
import { EventInvoicePaymentHistorySection } from "../components/EventInvoicePaymentHistorySection"
import "@/styles/print.css"

/** A ticket order's detail. Custom invoices open on their own page at /organizer/custom-invoices/:id. */
export default function EventInvoiceDetailPage() {
  const { invoiceUniqueId = "" } = useParams()
  const handleBack = useBackToInvoiceList(APP_ROUTES.eventInvoices.list)
  const detailQuery = useEventInvoiceDetail(invoiceUniqueId)
  const markPaid = useMarkEventInvoiceAsPaid(invoiceUniqueId)
  const cancel = useCancelEventInvoice(invoiceUniqueId)
  const resendTickets = useResendEventInvoice(invoiceUniqueId)
  const addNote = useAddEventInvoiceNote(invoiceUniqueId)
  const invoice = detailQuery.data

  if (!invoiceUniqueId || detailQuery.isError || !invoice) {
    return (
      <InvoiceDetailFallback
        isMissing={!invoiceUniqueId || isNotFoundError(detailQuery.error)}
        error={detailQuery.error}
        isRetrying={detailQuery.isFetching}
        onRetry={() => void detailQuery.refetch()}
        onBack={handleBack}
      />
    )
  }

  const hasAnyIssuedTicket = invoice.lineItems.some((item) => item.tickets.length > 0)

  return (
    <Stack gap={5} data-print-region>
      <EventInvoiceDetailHeader
        invoiceNo={invoice.invoiceNo}
        invoiceStatus={invoice.invoiceStatus}
        invoiceStatusLabel={invoice.invoiceStatusLabel}
        invoiceDateUtc={invoice.invoiceDateUtc}
        entityName={invoice.eventName}
        entityHref={APP_ROUTES.eventWizard.edit(invoice.eventUniqueId)}
        onBack={handleBack}
      />

      <InvoiceSettlementActions
        invoiceNo={invoice.invoiceNo}
        canMarkAsPaid={invoice.canMarkAsPaid}
        canCancel={invoice.canCancel}
        canResendTickets={invoice.canResendTickets && hasAnyIssuedTicket}
        buyerEmail={invoice.buyerEmail}
        markPaid={markPaid}
        cancel={cancel}
        resendTickets={resendTickets}
      />

      <EventInvoiceMoneyPanel invoice={invoice} />

      <EventInvoiceLineItemsSection
        invoiceUniqueId={invoice.invoiceUniqueId}
        lineItems={invoice.lineItems}
        canResendTickets={invoice.canResendTickets}
      />

      <EventInvoicePaymentHistorySection payments={invoice.payments} currencySymbol={invoice.currencySymbol} />

      <InvoiceNotesSection notes={invoice.notes} addNote={addNote} />
    </Stack>
  )
}

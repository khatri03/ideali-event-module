import { useParams } from "react-router-dom"
import { Stack } from "@chakra-ui/react"
import { formatBilledEntity } from "@/utils/customInvoiceEntity"
import { isNotFoundError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { useCustomInvoiceDetail, useCustomInvoiceDetailActions } from "../hooks/useCustomInvoices"
import { useBackToInvoiceList } from "../hooks/useInvoiceListReturnState"
import { CustomInvoiceDetailBody } from "../components/CustomInvoiceDetailBody"
import { EventInvoiceDetailHeader } from "../components/EventInvoiceDetailHeader"
import { EventInvoicePaymentHistorySection } from "../components/EventInvoicePaymentHistorySection"
import { InvoiceDetailFallback } from "../components/InvoiceDetailFallback"
import { InvoiceNotesSection } from "../components/InvoiceNotesSection"
import { InvoiceSettlementActions } from "../components/InvoiceSettlementActions"
import "@/styles/print.css"

/**
 * A custom invoice's detail, whatever module it bills. The billed record is named with its module label
 * ("Membership: Gold"), and only an Event-bound invoice links to its record.
 */
export default function CustomInvoiceDetailPage() {
  const { invoiceUniqueId = "" } = useParams()
  const handleBack = useBackToInvoiceList()
  const detailQuery = useCustomInvoiceDetail(invoiceUniqueId)
  const { markPaid, cancel, emailInvoice, addNote } = useCustomInvoiceDetailActions(invoiceUniqueId)
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

  const { entityUniqueId } = invoice
  return (
    <Stack gap={5} data-print-region>
      <EventInvoiceDetailHeader
        {...invoice}
        entityName={formatBilledEntity(invoice.moduleType, invoice.entityName) || null}
        entityHref={invoice.moduleType === "Event" && entityUniqueId ? APP_ROUTES.eventWizard.edit(entityUniqueId) : undefined}
        editHref={invoice.canEdit ? APP_ROUTES.customInvoices.edit(invoice.invoiceUniqueId) : undefined}
        onBack={handleBack}
      />
      <InvoiceSettlementActions
        invoiceNo={invoice.invoiceNo}
        canMarkAsPaid={invoice.canMarkAsPaid}
        canCancel={invoice.canCancel}
        canEmailInvoice={invoice.canSend}
        buyerEmail={invoice.buyerEmail}
        markPaid={markPaid}
        cancel={cancel}
        emailInvoice={emailInvoice}
      />
      <CustomInvoiceDetailBody invoice={invoice} />
      <EventInvoicePaymentHistorySection payments={invoice.payments} currencySymbol={invoice.currencySymbol} />
      <InvoiceNotesSection notes={invoice.notes} addNote={addNote} />
    </Stack>
  )
}

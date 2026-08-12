import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Box, Flex, Stack } from "@chakra-ui/react"
import { ErrorState } from "@/components/common"
import { extractApiError, isNotFoundError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { useEventInvoiceDetail } from "../hooks/useEventInvoices"
import { BackToInvoicesButton } from "../components/BackToInvoicesButton"
import { EventInvoiceDetailHeader } from "../components/EventInvoiceDetailHeader"
import { EventInvoiceMoneyPanel } from "../components/EventInvoiceMoneyPanel"
import { EventInvoiceNotesSection } from "../components/EventInvoiceNotesSection"
import { EventInvoiceSettlementActions } from "../components/EventInvoiceSettlementActions"
import { EventInvoiceLineItemsSection } from "../components/EventInvoiceLineItemsSection"
import { EventInvoicePaymentHistorySection } from "../components/EventInvoicePaymentHistorySection"
import { EventInvoiceDetailPageSkeleton } from "./EventInvoiceDetailPage.skeleton"
import "../print.css"

/**
 * Where "back" should land, as the list recorded it when it opened this invoice. Only an in-app path is
 * honoured - history state is attacker-reachable, and an absolute URL here would be an open redirect.
 */
function readReturnTo(state: unknown): string | null {
  if (typeof state !== "object" || state === null) {
    return null
  }
  const candidate = (state as { returnTo?: unknown }).returnTo
  const isInAppPath = typeof candidate === "string" && candidate.startsWith("/") && !candidate.startsWith("//")
  return isInAppPath ? candidate : null
}

export default function EventInvoiceDetailPage() {
  const { invoiceUniqueId = "" } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const detailQuery = useEventInvoiceDetail(invoiceUniqueId)
  const invoice = detailQuery.data

  const returnTo = readReturnTo(location.state) ?? APP_ROUTES.eventInvoices.list
  const handleBack = () => navigate(returnTo)

  const isMissing = !invoiceUniqueId || isNotFoundError(detailQuery.error)

  if (isMissing) {
    return (
      <Stack gap={5}>
        <BackToInvoicesButton onBack={handleBack} />
        <ErrorState
          tone="missing"
          title="Invoice not found"
          message="This invoice no longer exists, or it belongs to another organizer. Check the link and try again from the list."
        />
      </Stack>
    )
  }

  if (detailQuery.isError) {
    return (
      <Stack gap={5}>
        <BackToInvoicesButton onBack={handleBack} />
        <ErrorState
          title="Could not load this invoice"
          message={extractApiError(detailQuery.error)}
          isRetrying={detailQuery.isFetching}
          onRetry={() => void detailQuery.refetch()}
        />
      </Stack>
    )
  }

  if (detailQuery.isLoading || !invoice) {
    return (
      <Stack gap={5}>
        <BackToInvoicesButton onBack={handleBack} />
        <EventInvoiceDetailPageSkeleton />
      </Stack>
    )
  }

  const hasAnyIssuedTicket = invoice.lineItems.some((item) => item.tickets.length > 0)
  const canResendAllTickets = invoice.canResendTickets && hasAnyIssuedTicket
  const hasSettlementActions = invoice.canMarkAsPaid || invoice.canCancel || canResendAllTickets

  return (
    <Stack gap={5} data-print-region>
      <EventInvoiceDetailHeader
        invoiceNo={invoice.invoiceNo}
        invoiceStatus={invoice.invoiceStatus}
        invoiceStatusLabel={invoice.invoiceStatusLabel}
        invoiceDateUtc={invoice.invoiceDateUtc}
        eventUniqueId={invoice.eventUniqueId}
        eventName={invoice.eventName}
        onBack={handleBack}
      />

      {hasSettlementActions ? (
        <Box data-print-hide>
          <Flex justify="flex-end">
            <EventInvoiceSettlementActions
              invoiceUniqueId={invoice.invoiceUniqueId}
              invoiceNo={invoice.invoiceNo}
              canMarkAsPaid={invoice.canMarkAsPaid}
              canCancel={invoice.canCancel}
              canResendTickets={canResendAllTickets}
            />
          </Flex>
        </Box>
      ) : null}

      <EventInvoiceMoneyPanel invoice={invoice} />

      <EventInvoiceLineItemsSection
        invoiceUniqueId={invoice.invoiceUniqueId}
        lineItems={invoice.lineItems}
        canResendTickets={invoice.canResendTickets}
      />

      <EventInvoicePaymentHistorySection payments={invoice.payments} currencySymbol={invoice.currencySymbol} />

      <EventInvoiceNotesSection invoiceUniqueId={invoice.invoiceUniqueId} notes={invoice.notes} />
    </Stack>
  )
}

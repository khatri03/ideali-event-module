import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Box, Flex, Stack } from "@chakra-ui/react"
import { ErrorState } from "@/components/common"
import { extractApiError, isNotFoundError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { useEventInvoiceDetail } from "../hooks/useEventInvoices"
import { BackToInvoicesButton } from "../components/BackToInvoicesButton"
import { EventInvoiceDetailHeader } from "../components/EventInvoiceDetailHeader"
import { EventInvoiceMoneyPanel } from "../components/EventInvoiceMoneyPanel"
import { EventInvoiceCustomDetailBody } from "../components/EventInvoiceCustomDetailBody"
import { EventInvoiceNotesSection } from "../components/EventInvoiceNotesSection"
import { EventInvoiceSettlementActions } from "../components/EventInvoiceSettlementActions"
import { EventInvoiceLineItemsSection } from "../components/EventInvoiceLineItemsSection"
import { EventInvoicePaymentHistorySection } from "../components/EventInvoicePaymentHistorySection"
import { LinkedInvoicePanel } from "../components/LinkedInvoicePanel"
import { EventInvoiceDetailPageSkeleton } from "./EventInvoiceDetailPage.skeleton"
import "@/styles/print.css"

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

  const isCustom = invoice.invoiceType === "Custom"
  const hasAnyIssuedTicket = invoice.lineItems.some((item) => item.tickets.length > 0)
  const canResendAllTickets = invoice.canResendTickets && hasAnyIssuedTicket
  // A custom invoice still open to online payment can be emailed to its buyer with a working payable link.
  const canEmailInvoice = isCustom && invoice.canPayOnline
  const hasSettlementActions = invoice.canMarkAsPaid || invoice.canCancel || canResendAllTickets || canEmailInvoice

  return (
    <Stack gap={5} data-print-region>
      <EventInvoiceDetailHeader
        invoiceNo={invoice.invoiceNo}
        invoiceStatus={invoice.invoiceStatus}
        invoiceStatusLabel={invoice.invoiceStatusLabel}
        invoiceDateUtc={invoice.invoiceDateUtc}
        eventUniqueId={invoice.eventUniqueId}
        eventName={invoice.eventName}
        editHref={invoice.canEdit ? APP_ROUTES.eventInvoices.customEdit(invoice.invoiceUniqueId) : undefined}
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
              canEmailInvoice={canEmailInvoice}
              buyerEmail={invoice.buyerEmail}
            />
          </Flex>
        </Box>
      ) : null}

      {isCustom ? (
        <EventInvoiceCustomDetailBody invoice={invoice} />
      ) : (
        <>
          <EventInvoiceMoneyPanel invoice={invoice} />

          {/* A ticket invoice is only ever the target of a link, so it shows the reference but offers no way to start one. */}
          {invoice.linkedInvoice ? (
            <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 7 }}>
              <LinkedInvoicePanel
                invoiceUniqueId={invoice.invoiceUniqueId}
                invoiceNo={invoice.invoiceNo}
                linkedInvoice={invoice.linkedInvoice}
                canLink={false}
              />
            </Box>
          ) : null}

          <EventInvoiceLineItemsSection
            invoiceUniqueId={invoice.invoiceUniqueId}
            lineItems={invoice.lineItems}
            canResendTickets={invoice.canResendTickets}
          />
        </>
      )}

      <EventInvoicePaymentHistorySection payments={invoice.payments} currencySymbol={invoice.currencySymbol} />

      <EventInvoiceNotesSection invoiceUniqueId={invoice.invoiceUniqueId} notes={invoice.notes} />
    </Stack>
  )
}

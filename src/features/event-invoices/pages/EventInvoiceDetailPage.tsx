import { useParams, useNavigate } from "react-router-dom"
import { Box, Button, Stack, Text } from "@chakra-ui/react"
import { ArrowLeft } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { useEventInvoiceDetail } from "../hooks/useEventInvoices"
import { EventInvoiceSummaryCard } from "../components/EventInvoiceSummaryCard"
import { EventInvoiceNotesSection } from "../components/EventInvoiceNotesSection"
import { EventInvoiceSettlementActions } from "../components/EventInvoiceSettlementActions"
import { EventInvoiceLineItemsSection } from "../components/EventInvoiceLineItemsSection"
import { EventInvoicePaymentHistorySection } from "../components/EventInvoicePaymentHistorySection"
import { EventInvoiceDetailPageSkeleton } from "./EventInvoiceDetailPage.skeleton"

export default function EventInvoiceDetailPage() {
  const { invoiceUniqueId = "" } = useParams()
  const navigate = useNavigate()
  const detailQuery = useEventInvoiceDetail(invoiceUniqueId)
  const invoice = detailQuery.data

  return (
    <Stack gap={5}>
      <Button
        variant="outline"
        borderRadius="14px"
        minH="11"
        px={4}
        w={{ base: "full", md: "auto" }}
        alignSelf="flex-start"
        cursor="pointer"
        onClick={() => navigate(APP_ROUTES.eventInvoices.list)}
      >
        <ArrowLeft size={16} />
        Back to invoices
      </Button>

      {detailQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(detailQuery.error)}
          </Text>
        </Box>
      ) : detailQuery.isLoading || !invoice ? (
        <EventInvoiceDetailPageSkeleton />
      ) : (
        <>
          <EventInvoiceSummaryCard invoice={invoice} />
          <EventInvoiceSettlementActions
            invoiceUniqueId={invoice.invoiceUniqueId}
            invoiceNo={invoice.invoiceNo}
            canMarkAsPaid={invoice.canMarkAsPaid}
            canCancel={invoice.canCancel}
          />
          <EventInvoiceNotesSection invoiceUniqueId={invoice.invoiceUniqueId} notes={invoice.notes} />
          <EventInvoiceLineItemsSection
            invoiceUniqueId={invoice.invoiceUniqueId}
            lineItems={invoice.lineItems}
            currencySymbol={invoice.currencySymbol}
            canResendTickets={invoice.canResendTickets}
          />
          <EventInvoicePaymentHistorySection payments={invoice.payments} currencySymbol={invoice.currencySymbol} />
        </>
      )}
    </Stack>
  )
}

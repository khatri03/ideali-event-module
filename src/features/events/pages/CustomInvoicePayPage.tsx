import { Box, Container } from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import { InvoicePayView } from "@/features/events/components/invoice-pay/InvoicePayView"
import { useCustomInvoicePaySummary, useStartCustomInvoicePayment } from "@/features/events/hooks/useCustomInvoicePay"
import "@/styles/print.css"

/** Public: the buyer pays an organizer's custom invoice with the shared link alone, signed in or not. */
export function CustomInvoicePayPage() {
  const { invoiceUniqueId = "" } = useParams<{ invoiceUniqueId: string }>()
  const summaryQuery = useCustomInvoicePaySummary(invoiceUniqueId)
  const startPayment = useStartCustomInvoicePayment(invoiceUniqueId)

  return (
    <Box
      minH="100dvh"
      bg="gray.50"
      py={{ base: 6, md: 10 }}
      px={{ base: 4, md: 6 }}
      display="flex"
      flexDirection="column"
      alignItems="center"
    >
      <Container maxW="3xl" px={0} w="full" my="auto">
        <InvoicePayView
          invoiceUniqueId={invoiceUniqueId}
          summary={summaryQuery.data}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
          isRetrying={summaryQuery.isFetching}
          onRetry={() => void summaryQuery.refetch()}
          onStartPayment={startPayment.mutateAsync}
        />
      </Container>
    </Box>
  )
}

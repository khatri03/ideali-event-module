import { useState } from "react"
import { Box, Container, Heading, Stack, Text } from "@chakra-ui/react"
import { useParams } from "react-router-dom"
import { InvoicePayForm } from "@/features/events/components/invoice-pay/InvoicePayForm"
import { RegistrationStripeProvider } from "@/features/events/components/registration/RegistrationStripeProvider"
import { useEventInvoicePaySummary, useStartEventInvoicePayment } from "@/features/events/hooks/useEventInvoicePay"
import { formatAmount } from "@/features/events/utils/registrationFormat"

/** Public: the buyer pays an organizer's custom invoice with the shared link alone, signed in or not. */
export function EventInvoicePayPage() {
  const { invoiceUniqueId = "" } = useParams<{ invoiceUniqueId: string }>()
  const { data: summary } = useEventInvoicePaySummary(invoiceUniqueId)
  const startPayment = useStartEventInvoicePayment(invoiceUniqueId)
  const [hasPaid, setHasPaid] = useState(false)

  return (
    <Box minH="100dvh" bg="gray.50" py={{ base: 6, md: 10 }} px={{ base: 4, md: 6 }} display="flex" flexDirection="column">
      <Container maxW="3xl" px={0} w="full" my="auto">
        {hasPaid ? <Heading>Payment received</Heading> : null}
        {!hasPaid && summary?.payState === "Payable" ? (
          <Stack gap={4}>
            <Text>{summary.invoiceNo}</Text>
            <Text>{summary.eventName}</Text>
            <Text>{formatAmount(summary.outstandingAmount, summary.currencyCode)}</Text>
            <RegistrationStripeProvider
              paymentAccountUniqueId={summary.paymentAccountUniqueId}
              amount={summary.outstandingAmount}
              currencyCode={summary.currencyCode}
            >
              <InvoicePayForm
                amount={summary.outstandingAmount}
                currencyCode={summary.currencyCode}
                invoiceUniqueId={invoiceUniqueId}
                onStartPayment={startPayment.mutateAsync}
                onPaid={() => setHasPaid(true)}
              />
            </RegistrationStripeProvider>
          </Stack>
        ) : null}
      </Container>
    </Box>
  )
}

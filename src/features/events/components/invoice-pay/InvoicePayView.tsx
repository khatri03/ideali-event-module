import { useState } from "react"
import { Box, Stack } from "@chakra-ui/react"
import { RegistrationStripeProvider } from "@/features/events/components/registration/RegistrationStripeProvider"
import { useStripeCredentials } from "@/features/events/hooks/useStripeCredentials"
import type { CustomInvoicePaySummary } from "@/features/events/schemas/customInvoicePay.schemas"
import { formatAmount } from "@/features/events/utils/registrationFormat"
import { formatBilledEntity } from "@/utils/customInvoiceEntity"
import { InvoicePayForm } from "./InvoicePayForm"
import { InvoicePayPrintableInvoice } from "./InvoicePayPrintableInvoice"
import { InvoicePayStatusCard } from "./InvoicePayStatusCard"
import { InvoicePayFormSkeleton, InvoicePaySummaryCardSkeleton } from "./InvoicePaySummaryCard.skeleton"

type StartPayment = () => Promise<{ clientSecret: string }>

interface InvoicePayViewProps {
  invoiceUniqueId: string
  /** Null once loaded means the invoice does not exist, or is not one a buyer can pay through a link. */
  summary: CustomInvoicePaySummary | null | undefined
  isLoading: boolean
  isError: boolean
  isRetrying: boolean
  onRetry: () => void
  onStartPayment: StartPayment
}

interface PaymentReceipt {
  invoiceNo: string
  amount: string
}

/** Picks the one state a buyer sees. Only a Payable invoice with a payment account ever renders the card form. */
export function InvoicePayView({ invoiceUniqueId, summary, isLoading, isError, isRetrying, onRetry, onStartPayment }: InvoicePayViewProps) {
  // Kept apart from the summary: a refetch after the webhook settles would otherwise report the amount as zero.
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)

  if (receipt) {
    return (
      <InvoicePayStatusCard
        tone="success"
        title="Payment received"
        description={`Thank you. Your payment of ${receipt.amount} for invoice ${receipt.invoiceNo} went through.`}
      />
    )
  }
  if (isLoading) return <InvoicePaySummaryCardSkeleton />
  if (isError) {
    return (
      <InvoicePayStatusCard
        tone="danger"
        title="We couldn't load this invoice"
        description="Check your connection and try again."
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    )
  }
  if (!summary) {
    return (
      <InvoicePayStatusCard
        tone="danger"
        title="We couldn't find this invoice"
        description="Check the link you were sent, or ask the organizer to send it again."
      />
    )
  }
  if (summary.payState !== "Payable" || !summary.paymentAccountUniqueId) {
    return <TerminalInvoiceCard summary={summary} />
  }

  return (
    <PayableInvoice
      summary={summary}
      paymentAccountUniqueId={summary.paymentAccountUniqueId}
      invoiceUniqueId={invoiceUniqueId}
      onStartPayment={onStartPayment}
      onPaid={() =>
        setReceipt({ invoiceNo: summary.invoiceNo, amount: formatAmount(summary.outstandingAmount, summary.currencyCode) })
      }
    />
  )
}

function TerminalInvoiceCard({ summary }: { summary: CustomInvoicePaySummary }) {
  const { invoiceNo } = summary
  const billedEntity = formatBilledEntity(summary.moduleType, summary.entityName)
  const paidInvoice = billedEntity ? `Invoice ${invoiceNo} for ${billedEntity}` : `Invoice ${invoiceNo}`

  const statusCard =
    summary.payState === "Paid" ? (
      <InvoicePayStatusCard
        tone="success"
        title="This invoice is paid"
        description={`${paidInvoice} has been paid. There is nothing left to pay.`}
      />
    ) : summary.payState === "Cancelled" ? (
      <InvoicePayStatusCard
        tone="danger"
        title="This invoice was cancelled"
        description={`Invoice ${invoiceNo} was cancelled by the organizer and can no longer be paid. Contact the organizer if you think this is a mistake.`}
      />
    ) : (
      <InvoicePayStatusCard
        tone="pending"
        title="Online payment isn't available"
        description={`Invoice ${invoiceNo} can't be paid online right now. Contact the organizer to arrange payment.`}
      />
    )

  // The on-screen explanation is chrome; the invoice itself still prints so the buyer can keep a paper copy.
  return (
    <Stack gap={4}>
      <Box data-print-hide>{statusCard}</Box>
      <InvoicePayPrintableInvoice summary={summary} />
    </Stack>
  )
}

interface PayableInvoiceProps {
  summary: CustomInvoicePaySummary
  paymentAccountUniqueId: string
  invoiceUniqueId: string
  onStartPayment: StartPayment
  onPaid: () => void
}

function PayableInvoice({ summary, paymentAccountUniqueId, invoiceUniqueId, onStartPayment, onPaid }: PayableInvoiceProps) {
  // Same query key as RegistrationStripeProvider, so this read costs no second request.
  const credentials = useStripeCredentials(paymentAccountUniqueId)

  return (
    <Stack gap={4}>
      <InvoicePayPrintableInvoice summary={summary} />
      <Box data-print-hide>
        {credentials.isError ? (
          <InvoicePayStatusCard
            tone="danger"
            title="Card payment is unavailable"
            description="The card form couldn't load. Try again in a moment."
            onRetry={() => void credentials.refetch()}
            isRetrying={credentials.isFetching}
          />
        ) : credentials.isPending ? (
          <InvoicePayFormSkeleton />
        ) : (
          <RegistrationStripeProvider
            paymentAccountUniqueId={paymentAccountUniqueId}
            amount={summary.outstandingAmount}
            currencyCode={summary.currencyCode}
          >
            <InvoicePayForm
              amount={summary.outstandingAmount}
              currencyCode={summary.currencyCode}
              invoiceUniqueId={invoiceUniqueId}
              onStartPayment={onStartPayment}
              onPaid={onPaid}
            />
          </RegistrationStripeProvider>
        )}
      </Box>
    </Stack>
  )
}

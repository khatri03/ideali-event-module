import { Badge, Wrap } from "@chakra-ui/react"
import { EVENT_INVOICE_PAYMENT_METHOD_OPTIONS } from "@/api/eventInvoices"

interface PaymentPillsProps {
  paymentMethod: string | null
  paymentSource: string | null
}

function methodLabel(value: string) {
  return EVENT_INVOICE_PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value
}

/**
 * How the invoice was paid, shown beside the invoice number rather than in columns of its own - an
 * unpaid invoice simply has nothing to show, which would leave those columns empty on most rows.
 */
export function PaymentPills({ paymentMethod, paymentSource }: PaymentPillsProps) {
  if (!paymentMethod && !paymentSource) return null

  return (
    <Wrap mt={1.5} gap={1.5}>
      {paymentMethod ? (
        <Badge colorPalette="blue" variant="subtle" borderRadius="full" px={2.5} py={0.5} fontSize="xs" fontWeight="600">
          {methodLabel(paymentMethod)}
        </Badge>
      ) : null}

      {paymentSource ? (
        <Badge colorPalette="gray" variant="subtle" borderRadius="full" px={2.5} py={0.5} fontSize="xs" fontWeight="600">
          {paymentSource}
        </Badge>
      ) : null}
    </Wrap>
  )
}

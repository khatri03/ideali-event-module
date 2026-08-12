import { Badge, Box, Heading, Table, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import type { EventInvoicePaymentAttempt } from "@/api/eventInvoices"
import { EVENT_INVOICE_PAYMENT_METHOD_OPTIONS } from "@/api/eventInvoices"
import { EMPTY_VALUE, formatCurrency } from "@/utils/format"
import { parseUtcDateTime } from "@/utils/utcDates"

interface EventInvoicePaymentHistorySectionProps {
  payments: EventInvoicePaymentAttempt[]
  currencySymbol: string
}

/** Mirrors the gateway's payment statuses; anything newer falls back to neutral rather than green. */
const PAYMENT_STATUS_TOKENS: Record<string, { bg: string; fg: string }> = {
  Success: { bg: "status.success.bg", fg: "status.success.fg" },
  Pending: { bg: "status.warning.bg", fg: "status.warning.fg" },
  Failed: { bg: "status.error.bg", fg: "status.error.fg" },
}

const NEUTRAL_PAYMENT_TOKENS = { bg: "status.neutral.bg", fg: "status.neutral.fg" }

function paymentMethodLabel(value: string) {
  return EVENT_INVOICE_PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function formatDate(value: string) {
  const parsed = parseUtcDateTime(value)
  return parsed ? format(parsed, "MMM d, yyyy h:mm a") : EMPTY_VALUE
}

export function EventInvoicePaymentHistorySection({ payments, currencySymbol }: EventInvoicePaymentHistorySectionProps) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      <Heading as="h2" fontSize="lg" fontWeight="800" color="text.primary" mb={4}>
        Payment attempts
      </Heading>

      {payments.length === 0 ? (
        <Text fontSize="sm" color="text.secondary">
          No payment has been attempted on this invoice yet.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table.Root variant="line" size="sm">
            <Table.Caption srOnly>Every payment attempted against this invoice</Table.Caption>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Method</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Amount</Table.ColumnHeader>
                <Table.ColumnHeader>Reference</Table.ColumnHeader>
                <Table.ColumnHeader>Date</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {payments.map((payment, index) => (
                <Table.Row key={`${payment.referenceNo ?? index}-${payment.paymentDateUtc}`}>
                  <Table.Cell fontWeight="600" color="text.primary">
                    {paymentMethodLabel(payment.paymentMethod)}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      bg={(PAYMENT_STATUS_TOKENS[payment.paymentStatus] ?? NEUTRAL_PAYMENT_TOKENS).bg}
                      color={(PAYMENT_STATUS_TOKENS[payment.paymentStatus] ?? NEUTRAL_PAYMENT_TOKENS).fg}
                      borderRadius="full"
                      px={3}
                      py={1}
                      fontWeight="700"
                    >
                      {payment.paymentStatusLabel}
                    </Badge>
                    {payment.errorMessage ? (
                      <Text mt={1} fontSize="xs" color="status.error.fg">
                        {payment.errorMessage}
                      </Text>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="700" color="text.primary">
                    {formatCurrency(payment.amount, currencySymbol)}
                  </Table.Cell>
                  <Table.Cell fontFamily="mono" fontSize="xs" color="text.secondary">
                    {payment.referenceNo ?? EMPTY_VALUE}
                  </Table.Cell>
                  <Table.Cell fontSize="sm" color="text.secondary">
                    {formatDate(payment.paymentDateUtc)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Box>
  )
}

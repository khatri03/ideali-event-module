import { Badge, Box, Heading, Table, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import type { EventInvoicePaymentAttempt } from "@/api/eventInvoices"
import { EVENT_INVOICE_PAYMENT_METHOD_OPTIONS } from "@/api/eventInvoices"

interface EventInvoicePaymentHistorySectionProps {
  payments: EventInvoicePaymentAttempt[]
  currencySymbol: string
}

const STATUS_COLOR: Record<string, string> = {
  Success: "green",
  Pending: "orange",
  Failed: "red",
}

function paymentMethodLabel(value: string) {
  return EVENT_INVOICE_PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function formatDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "MMM d, yyyy h:mm a")
}

function formatMoney(value: number, currencySymbol: string) {
  return `${currencySymbol}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

export function EventInvoicePaymentHistorySection({ payments, currencySymbol }: EventInvoicePaymentHistorySectionProps) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      <Heading fontSize="lg" fontWeight="800" color="gray.900" mb={4}>
        Payment attempts
      </Heading>

      {payments.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No payment has been attempted on this invoice yet.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table.Root variant="line" size="sm">
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
                  <Table.Cell fontWeight="600" color="gray.900">
                    {paymentMethodLabel(payment.paymentMethod)}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={STATUS_COLOR[payment.paymentStatus] ?? "gray"} variant="subtle" borderRadius="full" px={3} py={1}>
                      {payment.paymentStatus}
                    </Badge>
                    {payment.errorMessage ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {payment.errorMessage}
                      </Text>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="700" color="gray.900">
                    {formatMoney(payment.amount, currencySymbol)}
                  </Table.Cell>
                  <Table.Cell fontFamily="mono" fontSize="xs" color="gray.600">
                    {payment.referenceNo ?? "—"}
                  </Table.Cell>
                  <Table.Cell fontSize="sm" color="gray.600">
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

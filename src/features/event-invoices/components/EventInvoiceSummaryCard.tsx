import { Badge, Box, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { parseUtcDateTime } from "@/utils/utcDates"

interface EventInvoiceSummaryCardProps {
  invoice: EventInvoiceDetail
}

function formatDate(value: string) {
  const parsed = parseUtcDateTime(value)
  return parsed ? format(parsed, "MMM d, yyyy 'at' h:mm a") : "—"
}

function formatMoney(value: number | null | undefined, currencySymbol: string) {
  if (value === null || value === undefined) return "—"
  return `${currencySymbol}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={1}>
      <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.1em">
        {label}
      </Text>
      <Text fontSize="md" fontWeight="700" color="gray.900">
        {value}
      </Text>
    </Stack>
  )
}

export function EventInvoiceSummaryCard({ invoice }: EventInvoiceSummaryCardProps) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      <Stack direction={{ base: "column", md: "row" }} justify="space-between" gap={4} mb={5}>
        <Stack gap={1}>
          <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.14em">
            Invoice
          </Text>
          <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
            {invoice.invoiceNo}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {invoice.eventName} · {formatDate(invoice.invoiceDateUtc)}
          </Text>
        </Stack>
        <Badge alignSelf={{ base: "flex-start", md: "center" }} colorPalette="purple" variant="subtle" borderRadius="full" px={4} py={2} fontSize="sm">
          {invoice.invoiceStatusLabel}
        </Badge>
      </Stack>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={5} mb={6}>
        <Figure label="Buyer" value={invoice.buyerName || "—"} />
        <Figure label="Email" value={invoice.buyerEmail || "—"} />
        <Figure label="Phone" value={invoice.buyerPhone || "—"} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={4}>
        <Figure label="Subtotal" value={formatMoney(invoice.subTotal, invoice.currencySymbol)} />
        <Figure label="Discount" value={formatMoney(invoice.discountAmount, invoice.currencySymbol)} />
        <Figure label="Tax" value={formatMoney(invoice.taxAmount, invoice.currencySymbol)} />
        <Figure label="Service charges" value={formatMoney(invoice.serviceCharges, invoice.currencySymbol)} />
        <Figure label="Total" value={formatMoney(invoice.totalAmount, invoice.currencySymbol)} />
        <Figure label="Balance" value={formatMoney(invoice.balanceAmount, invoice.currencySymbol)} />
      </SimpleGrid>

      {invoice.discountCouponCode ? (
        <Text mt={4} fontSize="sm" color="gray.600">
          Coupon applied: <Text as="span" fontWeight="700" color="gray.900">{invoice.discountCouponCode}</Text>
        </Text>
      ) : null}
    </Box>
  )
}

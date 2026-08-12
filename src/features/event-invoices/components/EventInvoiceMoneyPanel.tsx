import { Box, Flex, HStack, Separator, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { EMPTY_VALUE, formatCurrency, formatCurrencyMagnitude, moneySign, subtractMoney } from "@/utils/format"
import { parseUtcDateTime } from "@/utils/utcDates"
import { EventInvoiceBuyerPanel } from "./EventInvoiceBuyerPanel"
import { EventInvoiceItemsTable } from "./EventInvoiceItemsTable"
import { InvoiceDetailPanel, InvoiceMutedLine } from "./InvoiceDetailPanel"

interface EventInvoiceMoneyPanelProps {
  invoice: EventInvoiceDetail
}

type BalanceTone = "outstanding" | "credit" | "settled"

interface BalanceStanding {
  tone: BalanceTone
  label: string
}

const BALANCE_TOKENS: Record<BalanceTone, { bg: string; fg: string }> = {
  outstanding: { bg: "status.warning.bg", fg: "status.warning.fg" },
  credit: { bg: "status.info.bg", fg: "status.info.fg" },
  settled: { bg: "status.success.bg", fg: "status.success.fg" },
}

/**
 * A balance is only worth shouting about when there is one. A settled order states so plainly instead of
 * highlighting a zero, and money owed back to the buyer reads as a credit rather than a debt.
 */
function balanceStanding(balanceAmount: string): BalanceStanding {
  const sign = moneySign(balanceAmount)
  if (sign > 0) {
    return { tone: "outstanding", label: "Outstanding balance" }
  }
  if (sign < 0) {
    return { tone: "credit", label: "Credit due to buyer" }
  }
  return { tone: "settled", label: "Settled in full" }
}

function formatDate(value: string) {
  const parsed = parseUtcDateTime(value)
  return parsed ? format(parsed, "MMM d, yyyy") : EMPTY_VALUE
}

function TotalRow({
  label,
  value,
  isStrong = false,
  valueColor = "text.primary",
  bordered = false,
}: {
  label: string
  value: string
  isStrong?: boolean
  valueColor?: string
  bordered?: boolean
}) {
  return (
    <Flex
      justify="space-between"
      gap={4}
      py={2}
      borderTop={bordered ? "1px solid" : undefined}
      borderBottom={bordered ? "1px solid" : undefined}
      borderColor={bordered ? "border.subtle" : undefined}
    >

      <Text fontSize={isStrong ? "md" : "sm"} fontWeight={isStrong ? "800" : "600"} color={isStrong ? "text.primary" : "text.secondary"}>
        {label}
      </Text>
      <Text fontSize={isStrong ? "md" : "sm"} fontWeight="800" color={valueColor} textAlign="right">
        {value}
      </Text>
    </Flex>
  )
}

function formatChargeRate(charge: EventInvoiceDetail["charges"][number]) {
  if (charge.calculationType !== "Percent") {
    return null
  }
  return `(${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(charge.value)}%)`
}

function ChargeRow({ label, rate, value }: { label: string; rate: string | null; value: string }) {
  return (
    <Flex justify="space-between" gap={4} py={1.5} pl={3}>
      <Text fontSize="sm" fontWeight="600" color="text.secondary">
        {label}
        {rate ? (
          <Text as="span" color="text.secondary" fontWeight="500">
            {" "}
            {rate}
          </Text>
        ) : null}
      </Text>
      <Text fontSize="sm" fontWeight="700" color="text.primary" textAlign="right">
        {value}
      </Text>
    </Flex>
  )
}

/** Everything about what the order costs and who owes it: buyer, priced items, then the total. */
export function EventInvoiceMoneyPanel({ invoice }: EventInvoiceMoneyPanelProps) {
  const charges = [...invoice.charges].sort((left, right) => left.displayOrder - right.displayOrder)
  const ticketCount = invoice.lineItems.reduce((total, item) => total + item.quantity, 0)
  const hasDiscount = Boolean(invoice.discountAmount) && moneySign(invoice.discountAmount as string) !== 0
  const discountMagnitude = hasDiscount ? (invoice.discountAmount as string).trim().replace(/^-/, "") : null
  const subtotalAfterDiscount = discountMagnitude ? subtractMoney(invoice.subTotal, discountMagnitude) : null
  const balanceAmount = invoice.balanceAmount ?? null
  const standing = balanceAmount === null ? null : balanceStanding(balanceAmount)
  const hasIssuedTickets = invoice.lineItems.some((item) => item.tickets.length > 0)

  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 7 }}>
      <Stack gap={{ base: 5, md: 6 }}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <EventInvoiceBuyerPanel
            invoiceUniqueId={invoice.invoiceUniqueId}
            invoiceNo={invoice.invoiceNo}
            buyerName={invoice.buyerName}
            buyerEmail={invoice.buyerEmail}
            buyerPhone={invoice.buyerPhone}
            canEditBuyer={invoice.canEditBuyer}
            hasIssuedTickets={hasIssuedTickets}
            canResendTickets={invoice.canResendTickets}
          />

          <InvoiceDetailPanel title="Order">
            <Text fontSize="md" fontWeight="800" color="text.primary">
              {ticketCount} {ticketCount === 1 ? "ticket" : "tickets"} across {invoice.lineItems.length}{" "}
              {invoice.lineItems.length === 1 ? "line" : "lines"}
            </Text>
            <InvoiceMutedLine>Issued {formatDate(invoice.invoiceDateUtc)}</InvoiceMutedLine>
            {invoice.discountCouponCode ? (
              <InvoiceMutedLine>
                Coupon{" "}
                <Text as="span" fontWeight="800" color="text.primary">
                  {invoice.discountCouponCode}
                </Text>
              </InvoiceMutedLine>
            ) : null}
          </InvoiceDetailPanel>
        </SimpleGrid>

        <EventInvoiceItemsTable lineItems={invoice.lineItems} currencySymbol={invoice.currencySymbol} />

        <Flex justify="flex-end">
          <Box w={{ base: "full", md: "360px" }}>
            <TotalRow label="Line Item Total" value={formatCurrency(invoice.subTotal, invoice.currencySymbol)} />
            {hasDiscount && discountMagnitude ? (
              <>
                <TotalRow
                  label="Discount"
                  value={`-${formatCurrencyMagnitude(discountMagnitude, invoice.currencySymbol)}`}
                  valueColor="status.success.fg"
                />
                <TotalRow label="Subtotal" value={formatCurrency(subtotalAfterDiscount, invoice.currencySymbol)} bordered />
              </>
            ) : null}
            {charges.length > 0 ? (
              <Stack gap={0} mt={1} mb={2}>
                {charges.map((charge) => (
                  <ChargeRow
                    key={`${charge.displayOrder}-${charge.label}-${charge.amount}`}
                    label={charge.label}
                    rate={formatChargeRate(charge)}
                    value={formatCurrency(charge.amount, invoice.currencySymbol)}
                  />
                ))}
              </Stack>
            ) : null}
            <Separator my={2} />
            <TotalRow label="Total" value={formatCurrency(invoice.totalAmount, invoice.currencySymbol)} isStrong />

            {standing && balanceAmount !== null ? (
              <HStack
                data-balance-tone={standing.tone}
                justify="space-between"
                gap={4}
                bg={BALANCE_TOKENS[standing.tone].bg}
                color={BALANCE_TOKENS[standing.tone].fg}
                borderRadius="14px"
                px={4}
                py={3}
                mt={2}
              >
                <Text fontSize="sm" fontWeight="900">
                  {standing.label}
                </Text>
                {standing.tone === "settled" ? null : (
                  <Text fontSize="lg" fontWeight="900">
                    {formatCurrencyMagnitude(balanceAmount, invoice.currencySymbol)}
                  </Text>
                )}
              </HStack>
            ) : null}
          </Box>
        </Flex>
      </Stack>
    </Box>
  )
}

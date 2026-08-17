import { Badge, Box, Flex, Heading, Stack, Text } from "@chakra-ui/react"
import { formatAmount } from "@/features/events/utils/registrationFormat"
import { groupInOrder } from "@/utils/collections"
import type { EventOrderCharge, EventOrderLineItem, EventOrderStatus } from "@/features/events/schemas/eventOrder.schemas"

interface OrderInvoiceBreakdownProps {
  order: EventOrderStatus
}

/**
 * The itemised half of the receipt: what each line cost, every charge that was added on top, and what
 * was actually collected. Only charges the buyer was billed for reach this page, so the rows always
 * add up to the total - a fee the organizer absorbs never appears here.
 */
export function OrderInvoiceBreakdown({ order }: OrderInvoiceBreakdownProps) {
  const currency = order.currencySymbol
  const hasBalance = order.balanceAmount !== null && order.balanceAmount > 0

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="24px"
      bg="white"
      p={{ base: 5, md: 6 }}
      boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)"
    >
      <Stack gap={5}>
        <Heading
          fontSize={{ base: "sm", md: "md" }}
          color="gray.900"
          borderBottomWidth="1px"
          borderBottomColor="gray.200"
          pb={4}
        >
          Payment summary
        </Heading>

        {order.lineItems.length > 0 ? (
          <Stack gap={5} separator={<Box borderTopWidth="1px" borderTopColor="gray.100" />}>
            {groupInOrder(order.lineItems, (line) => line.sessionName).map((group) => (
              <Stack key={group.key} gap={3}>
                {group.key ? (
                  <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                    {group.key}
                  </Text>
                ) : null}

                {group.items.map((line, index) => (
                  <LineItemRow key={`${line.ticketTypeName}-${index}`} line={line} currency={currency} />
                ))}
              </Stack>
            ))}
          </Stack>
        ) : null}

        <Stack gap={2} borderTopWidth="1px" borderTopColor="gray.200" pt={4}>
          <AmountRow label="Subtotal" amount={order.subTotal} currency={currency} />

          {order.discountAmount ? (
            <AmountRow
              label="Discount"
              amount={-order.discountAmount}
              currency={currency}
              tone="green"
              badge={order.discountCouponCode}
            />
          ) : null}

          {order.charges.length > 0
            ? order.charges.map((charge, index) => (
                <ChargeRow key={`${charge.label}-${index}`} charge={charge} currency={currency} />
              ))
            : null}
        </Stack>

        <Stack gap={2} borderTopWidth="1px" borderTopColor="gray.200" pt={4}>
          <Flex justify="space-between" align="baseline" gap={4}>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="800" color="gray.900">
              Total
            </Text>
            <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="800" color="gray.900">
              {formatAmount(order.totalAmount, currency)}
            </Text>
          </Flex>

          <AmountRow label="Amount paid" amount={order.amountPaid} currency={currency} />

          {hasBalance ? (
            <AmountRow label="Balance due" amount={order.balanceAmount ?? 0} currency={currency} tone="orange" />
          ) : null}
        </Stack>
      </Stack>
    </Box>
  )
}

interface LineItemRowProps {
  line: EventOrderLineItem
  currency: string | null
}

/**
 * Lines are priced gross and sum to the subtotal below; the coupon is deducted once, on its own row.
 * Splitting the same discount across the tickets it happened to be apportioned to only invites the
 * buyer to add it back onto a total that already has it taken off.
 */
function LineItemRow({ line, currency }: LineItemRowProps) {
  return (
    <Flex justify="space-between" align="start" gap={4}>
      <Stack gap={1} minW="0">
        <Text fontSize="sm" fontWeight="700" color="gray.900" wordBreak="break-word">
          {line.ticketTypeName || "Ticket"}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {line.quantity} × {formatAmount(line.unitPrice, currency)}
        </Text>
      </Stack>
      <Text fontSize="sm" fontWeight="700" color="gray.900" whiteSpace="nowrap" flexShrink={0}>
        {formatAmount(line.lineTotal, currency)}
      </Text>
    </Flex>
  )
}

interface ChargeRowProps {
  charge: EventOrderCharge
  currency: string | null
}

function ChargeRow({ charge, currency }: ChargeRowProps) {
  return <AmountRow label={charge.label || charge.chargeKind || "Charge"} amount={charge.amount} currency={currency} />
}

interface AmountRowProps {
  label: string
  amount: number
  currency: string | null
  tone?: "green" | "orange"
  badge?: string | null
}

const TONE_COLORS: Record<NonNullable<AmountRowProps["tone"]>, string> = {
  green: "green.600",
  orange: "orange.600",
}

function AmountRow({ label, amount, currency, tone, badge }: AmountRowProps) {
  const color = tone ? TONE_COLORS[tone] : "gray.700"
  // formatAmount floors negatives to zero, so the sign is rendered beside the magnitude instead.
  const isCredit = amount < 0

  return (
    <Flex justify="space-between" align="center" gap={4}>
      <Flex align="center" gap={2} minW="0">
        <Text fontSize="sm" color={tone ? color : "gray.600"} wordBreak="break-word">
          {label}
        </Text>
        {badge ? (
          <Badge colorPalette="green" variant="subtle" fontSize="10px" textTransform="uppercase">
            {badge}
          </Badge>
        ) : null}
      </Flex>
      <Text fontSize="sm" fontWeight="700" color={color} whiteSpace="nowrap">
        {isCredit ? "−" : ""}
        {formatAmount(Math.abs(amount), currency)}
      </Text>
    </Flex>
  )
}

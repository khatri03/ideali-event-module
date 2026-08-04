import { Box, Button, CloseButton, Dialog, Flex, Heading, Stack, Table, Text } from "@chakra-ui/react"
import { CONTROL_BUTTON_OUTLINE, CONTROL_BUTTON_PRIMARY } from "@/components/common/controlStyles"
import type { EventCartPaymentCharge } from "@/features/events/schemas/eventCart.schemas"
import { formatAmount, formatChargeRate, hexToRgba } from "@/features/events/utils/registrationFormat"

export interface PurchaseReviewTicketRow {
  sessionName: string
  ticketName: string
  quantity: number
  lineTotal: number
}

interface PurchaseReviewDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  eventTitle: string
  currencyCode: string | null
  accentColor: string
  selectedTicketCount: number
  paymentMethodLabel: string
  isCardPayment: boolean
  /** The outstanding purchase-review complaint, if the buyer has one to fix. */
  validationMessage: string | null
  ticketRows: PurchaseReviewTicketRow[]
  /** Before the coupon, so the discount reads as a deduction from a figure that is on the page. */
  grossSubtotal: number
  discountAmount: number
  /** What the percentage charges below are actually rated on. */
  netSubtotal: number
  chargeRows: EventCartPaymentCharge[]
  /** Server-priced amount that will be taken from the buyer. Nothing here is added up client-side. */
  grandTotal: number
  isConfirming: boolean
  onConfirm: () => void
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" bg="white" overflow="hidden">
      <Box px={4} py={3} bg="gray.50" borderBottomWidth="1px" borderBottomColor="gray.200">
        <Text fontSize="sm" fontWeight="700" color="gray.700">
          {title}
        </Text>
      </Box>
      {children}
    </Box>
  )
}

function TicketSummaryTable({ rows, currencyCode }: { rows: PurchaseReviewTicketRow[]; currencyCode: string | null }) {
  return (
    <Box overflowX="auto">
      <Table.Root variant="line" size="sm" borderColor="gray.200">
        <Table.Header>
          <Table.Row bg="white">
            <Table.ColumnHeader borderColor="gray.200" px={4} py={3}>
              Session
            </Table.ColumnHeader>
            <Table.ColumnHeader borderColor="gray.200" px={4} py={3}>
              Ticket
            </Table.ColumnHeader>
            <Table.ColumnHeader borderColor="gray.200" px={4} py={3} textAlign="center">
              Qty
            </Table.ColumnHeader>
            <Table.ColumnHeader borderColor="gray.200" px={4} py={3} textAlign="right">
              Total
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={`${row.sessionName}-${row.ticketName}`}>
              <Table.Cell borderColor="gray.200" px={4} py={3}>
                <Text fontWeight="700" color="gray.900" lineHeight="1.4">
                  {row.sessionName}
                </Text>
              </Table.Cell>
              <Table.Cell borderColor="gray.200" px={4} py={3}>
                <Text color="gray.700" lineHeight="1.4">
                  {row.ticketName}
                </Text>
              </Table.Cell>
              <Table.Cell borderColor="gray.200" px={4} py={3} textAlign="center">
                <Text fontWeight="700" color="gray.900">
                  {row.quantity}
                </Text>
              </Table.Cell>
              <Table.Cell borderColor="gray.200" px={4} py={3} textAlign="right">
                <Text fontWeight="700" color="gray.900" whiteSpace="nowrap">
                  {formatAmount(row.lineTotal, currencyCode)}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}

interface CostRowProps {
  label: string
  amount: string
  hint?: string
  tone?: "default" | "credit"
  isStrong?: boolean
}

function CostRow({ label, amount, hint, tone = "default", isStrong = false }: CostRowProps) {
  const color = tone === "credit" ? "green.700" : "gray.900"

  return (
    <Flex justify="space-between" gap={4} align="start">
      <Stack gap={0.5} minW={0}>
        <Text fontSize="sm" fontWeight={isStrong ? "800" : "600"} color={color}>
          {label}
        </Text>
        {hint ? (
          <Text fontSize="xs" color="gray.500">
            {hint}
          </Text>
        ) : null}
      </Stack>
      <Text fontSize="sm" fontWeight={isStrong ? "800" : "700"} color={color} flexShrink={0} whiteSpace="nowrap">
        {amount}
      </Text>
    </Flex>
  )
}

interface CostBreakdownProps {
  grossSubtotal: number
  discountAmount: number
  netSubtotal: number
  charges: EventCartPaymentCharge[]
  currencyCode: string | null
}

/** Every figure is server-priced. This walks the buyer from the ticket subtotal to the payable total. */
function CostBreakdown({ grossSubtotal, discountAmount, netSubtotal, charges, currencyCode }: CostBreakdownProps) {
  return (
    <Stack gap={3} p={4}>
      <CostRow label="Ticket subtotal" amount={formatAmount(grossSubtotal, currencyCode)} />

      {discountAmount > 0 ? (
        <>
          <CostRow label="Coupon discount" amount={`-${formatAmount(discountAmount, currencyCode)}`} tone="credit" />
          <CostRow label="Subtotal after discount" amount={formatAmount(netSubtotal, currencyCode)} />
        </>
      ) : null}

      {charges.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No additional charges apply to this payment method.
        </Text>
      ) : (
        charges.map((charge) => (
          <CostRow
            key={`${charge.source}-${charge.title}`}
            label={charge.title}
            hint={`${charge.source === "processor-fee" ? "Price" : "Rate"}: ${formatChargeRate(charge.valueType, charge.value, currencyCode)}`}
            amount={formatAmount(charge.amount, currencyCode)}
          />
        ))
      )}
    </Stack>
  )
}

/**
 * The last thing shown before any money moves: what was picked, what it costs, and exactly what will
 * be taken. The dialog only reports the confirm click - running the payment is its owner's job.
 */
export function PurchaseReviewDialog({
  isOpen,
  onOpenChange,
  eventTitle,
  currencyCode,
  accentColor,
  selectedTicketCount,
  paymentMethodLabel,
  isCardPayment,
  validationMessage,
  ticketRows,
  grossSubtotal,
  discountAmount,
  netSubtotal,
  chargeRows,
  grandTotal,
  isConfirming,
  onConfirm,
}: PurchaseReviewDialogProps) {
  // Card details were already collected on the payment step, so confirming here is the pay action.
  const confirmLabel = isCardPayment ? `Pay ${formatAmount(grandTotal, currencyCode)}` : "Confirm purchase"
  const ticketCountLabel = `${selectedTicketCount} ${selectedTicketCount === 1 ? "ticket" : "tickets"}`

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => onOpenChange(details.open)} size={{ base: "full", md: "xl" }}>
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.650" />
      <Dialog.Positioner alignItems="center" justifyContent="center" px={{ base: 0, md: 6 }} py={{ base: 0, md: 8 }}>
        <Dialog.Content
          borderRadius={{ base: "0", md: "28px" }}
          overflow="hidden"
          bg="white"
          boxShadow="0 30px 80px rgba(15, 23, 42, 0.28)"
          maxH={{ base: "100dvh", md: "85vh" }}
          display="flex"
          flexDirection="column"
        >
          <Box h="5px" bg={accentColor} />
          <Box px={{ base: 4, md: 6 }} py={4} borderBottomWidth="1px" borderBottomColor="gray.200">
            <Flex justify="space-between" align="start" gap={4}>
              <Stack gap={1} minW={0}>
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="gray.500" fontWeight="700">
                  Review purchase
                </Text>
                <Heading fontSize={{ base: "lg", md: "2xl" }} color="gray.900" letterSpacing="-0.03em" lineHeight="1.3">
                  {eventTitle}
                </Heading>
              </Stack>
              <CloseButton cursor="pointer" onClick={() => onOpenChange(false)} />
            </Flex>
          </Box>

          <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }} flex="1" overflowY="auto">
            <Stack gap={5}>
              <Box
                borderWidth="1px"
                borderColor={hexToRgba(accentColor, 0.35)}
                borderRadius="20px"
                bg={hexToRgba(accentColor, 0.08)}
                px={{ base: 4, md: 5 }}
                py={4}
              >
                <Flex
                  justify="space-between"
                  align={{ base: "start", sm: "center" }}
                  gap={3}
                  direction={{ base: "column", sm: "row" }}
                >
                  <Stack gap={1} minW={0}>
                    <Text
                      fontSize="xs"
                      fontWeight="700"
                      color="gray.600"
                      textTransform="uppercase"
                      letterSpacing="0.14em"
                    >
                      Total to pay
                    </Text>
                    <Text fontSize="sm" color="gray.600" wordBreak="break-word">
                      {ticketCountLabel} · {paymentMethodLabel}
                    </Text>
                  </Stack>
                  <Text
                    fontSize={{ base: "2xl", md: "3xl" }}
                    fontWeight="800"
                    color="gray.900"
                    lineHeight="1.1"
                    whiteSpace="nowrap"
                  >
                    {formatAmount(grandTotal, currencyCode)}
                  </Text>
                </Flex>
              </Box>

              {validationMessage ? (
                <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="18px" p={4} role="alert">
                  <Text fontSize="sm" color="red.700" fontWeight="600">
                    {validationMessage}
                  </Text>
                </Box>
              ) : null}

              <ReviewSection title="Ticket summary">
                <TicketSummaryTable rows={ticketRows} currencyCode={currencyCode} />
              </ReviewSection>

              <ReviewSection title="Cost breakdown">
                <CostBreakdown
                  grossSubtotal={grossSubtotal}
                  discountAmount={discountAmount}
                  netSubtotal={netSubtotal}
                  charges={chargeRows}
                  currencyCode={currencyCode}
                />
                <Box px={4} py={4} bg="gray.50" borderTopWidth="1px" borderTopColor="gray.200">
                  <CostRow label="Total to pay" amount={formatAmount(grandTotal, currencyCode)} isStrong />
                </Box>
              </ReviewSection>
            </Stack>
          </Box>

          <Box px={{ base: 4, md: 6 }} py={4} borderTopWidth="1px" borderTopColor="gray.200" bg="gray.50">
            <Flex justify="flex-end" gap={3} direction={{ base: "column-reverse", sm: "row" }}>
              <Button {...CONTROL_BUTTON_OUTLINE} w={{ base: "full", sm: "auto" }} onClick={() => onOpenChange(false)}>
                Back to payment
              </Button>
              <Button
                {...CONTROL_BUTTON_PRIMARY}
                bg={accentColor}
                minH="11"
                px={5}
                w={{ base: "full", sm: "auto" }}
                cursor={isConfirming ? "not-allowed" : "pointer"}
                _hover={{ bg: hexToRgba(accentColor, 0.88) }}
                _active={{ bg: hexToRgba(accentColor, 0.95) }}
                onClick={onConfirm}
                disabled={Boolean(validationMessage) || isConfirming}
                loading={isConfirming}
                loadingText="Processing..."
              >
                {confirmLabel}
              </Button>
            </Flex>
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

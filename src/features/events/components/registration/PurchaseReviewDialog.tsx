import { Box, Button, CloseButton, Dialog, Flex, Heading, SimpleGrid, Stack, Table, Text } from "@chakra-ui/react"
import { CONTROL_BUTTON_OUTLINE, CONTROL_BUTTON_PRIMARY } from "@/components/common/controlStyles"
import type { EventCartPaymentCharge, EventPaymentIntentResult } from "@/features/events/schemas/eventCart.schemas"
import { StripeCardFields } from "@/features/events/components/registration/StripeCardFields"
import { StripeCardFieldsSkeleton } from "@/features/events/components/registration/StripeCardFields.skeleton"
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
  selectedTicketTotal: number
  paymentMethodLabel: string
  isCardPayment: boolean
  /** The outstanding purchase-review complaint, if the buyer has one to fix. */
  validationMessage: string | null
  ticketRows: PurchaseReviewTicketRow[]
  chargeRows: EventCartPaymentCharge[]
  /** Null until the PaymentIntent comes back; card fields mount against it once set. */
  paymentIntent: EventPaymentIntentResult | null
  isCreatingIntent: boolean
  isConfirming: boolean
  onConfirm: () => void
  onPaid: () => void
}

function ReviewFigure({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={1}>
      <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.14em">
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="800" color="gray.900" lineHeight="1.3">
        {value}
      </Text>
    </Stack>
  )
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

function TicketSummaryTable({
  rows,
  currencyCode,
}: {
  rows: PurchaseReviewTicketRow[]
  currencyCode: string | null
}) {
  return (
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
              <Text fontWeight="700" color="gray.900">
                {formatAmount(row.lineTotal, currencyCode)}
              </Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

function ChargeList({ charges, currencyCode }: { charges: EventCartPaymentCharge[]; currencyCode: string | null }) {
  if (charges.length === 0) {
    return (
      <Stack gap={3} p={4}>
        <Text fontSize="sm" color="gray.600">
          No additional buyer charges.
        </Text>
      </Stack>
    )
  }

  return (
    <Stack gap={3} p={4}>
      {charges.map((charge) => (
        <Flex key={`${charge.source}-${charge.title}`} justify="space-between" gap={4} align="start">
          <Stack gap={0.5} minW={0}>
            <Text fontSize="sm" fontWeight="600" color="gray.900">
              {charge.title}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {charge.source === "processor-fee" ? "Price" : "Rate"}:{" "}
              {formatChargeRate(charge.valueType, charge.value, currencyCode)}
            </Text>
          </Stack>
          <Text fontSize="sm" fontWeight="700" color="gray.900" flexShrink={0}>
            {formatAmount(charge.amount, currencyCode)}
          </Text>
        </Flex>
      ))}
    </Stack>
  )
}

/**
 * The last thing shown before any money moves: what was picked, what it costs, and which method will
 * be charged. Confirming does not charge the card - it persists the order and mints the PaymentIntent
 * that the card fields are then mounted against.
 */
export function PurchaseReviewDialog({
  isOpen,
  onOpenChange,
  eventTitle,
  currencyCode,
  accentColor,
  selectedTicketCount,
  selectedTicketTotal,
  paymentMethodLabel,
  isCardPayment,
  validationMessage,
  ticketRows,
  chargeRows,
  paymentIntent,
  isCreatingIntent,
  isConfirming,
  onConfirm,
  onPaid,
}: PurchaseReviewDialogProps) {
  const showCardFields = isCardPayment && Boolean(paymentIntent)
  const showConfirmButton = !isCardPayment || !paymentIntent
  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => onOpenChange(details.open)} size="xl">
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.650" />
      <Dialog.Positioner alignItems="center" justifyContent="center" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
        <Dialog.Content
          borderRadius="28px"
          overflow="hidden"
          bg="white"
          boxShadow="0 30px 80px rgba(15, 23, 42, 0.28)"
          maxH="85vh"
          display="flex"
          flexDirection="column"
        >
          <Box h="5px" bg={accentColor} />
          <Box px={{ base: 4, md: 6 }} py={4} borderBottomWidth="1px" borderBottomColor="gray.200">
            <Flex justify="space-between" align="start" gap={4}>
              <Stack gap={1}>
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="gray.500" fontWeight="700">
                  Review purchase
                </Text>
                <Heading fontSize={{ base: "xl", md: "2xl" }} color="gray.900" letterSpacing="-0.03em">
                  {eventTitle}
                </Heading>
              </Stack>
              <CloseButton onClick={() => onOpenChange(false)} />
            </Flex>
          </Box>

          <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }} flex="1" overflowY="auto">
            <Stack gap={5}>
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" bg="gray.50" p={4}>
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                  <ReviewFigure label="Tickets" value={`${selectedTicketCount} selected`} />
                  <ReviewFigure label="Total" value={formatAmount(selectedTicketTotal, currencyCode)} />
                  <ReviewFigure label="Payment method" value={paymentMethodLabel} />
                </SimpleGrid>
              </Box>

              {validationMessage ? (
                <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="18px" p={4}>
                  <Text fontSize="sm" color="red.700" fontWeight="600">
                    {validationMessage}
                  </Text>
                </Box>
              ) : null}

              <ReviewSection title="Ticket summary">
                <TicketSummaryTable rows={ticketRows} currencyCode={currencyCode} />
              </ReviewSection>

              <ReviewSection title="Charges">
                <ChargeList charges={chargeRows} currencyCode={currencyCode} />
              </ReviewSection>

              {isCardPayment ? (
                showCardFields && paymentIntent ? (
                  <StripeCardFields
                    intent={paymentIntent}
                    accentColor={accentColor}
                    isConfirming={isConfirming}
                    onPaid={onPaid}
                  />
                ) : isCreatingIntent ? (
                  <StripeCardFieldsSkeleton />
                ) : null
              ) : null}
            </Stack>
          </Box>

          <Box px={{ base: 4, md: 6 }} py={4} borderTopWidth="1px" borderTopColor="gray.200" bg="gray.50">
            <Flex justify="flex-end" gap={3} direction={{ base: "column-reverse", sm: "row" }}>
              <Button {...CONTROL_BUTTON_OUTLINE} onClick={() => onOpenChange(false)}>
                Back to payment
              </Button>
              {showConfirmButton ? (
                <Button
                  {...CONTROL_BUTTON_PRIMARY}
                  bg={accentColor}
                  minH="11"
                  px={5}
                  cursor={isCreatingIntent ? "not-allowed" : "pointer"}
                  _hover={{ bg: hexToRgba(accentColor, 0.88) }}
                  _active={{ bg: hexToRgba(accentColor, 0.95) }}
                  onClick={onConfirm}
                  disabled={Boolean(validationMessage) || isCreatingIntent}
                  loading={isCreatingIntent}
                  loadingText="Preparing..."
                >
                  Confirm Purchase
                </Button>
              ) : null}
            </Flex>
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

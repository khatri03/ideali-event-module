import { Fragment } from "react"
import { Badge, Box, HStack, Separator, Stack, Table, Text } from "@chakra-ui/react"
import type { EventRegistrationTicket } from "@/api/events"
import type { EventCartPaymentBreakdown } from "@/features/events/schemas/eventCart.schemas"
import type { SelectedTicketSummaryItem } from "@/features/events/components/registration/types"
import { TicketQuantityStepper } from "@/features/events/components/registration/TicketQuantityStepper"
import { formatAmount, formatChargeRate } from "@/features/events/utils/registrationFormat"

interface SessionGroup {
  sessionId: string
  sessionName: string
  items: SelectedTicketSummaryItem[]
  total: number
}

interface PaymentBreakdownTableProps {
  breakdown: EventCartPaymentBreakdown
  sessionGroups: SessionGroup[]
  /** Before the coupon. The discount and the amount the charges are rated on follow it as their own rows. */
  grossSubtotal: number
  discountAmount: number
  currencyCode: string | null
  onChangeQuantity: (ticket: EventRegistrationTicket, quantity: number) => void
  onRequestRemove: (ticket: EventRegistrationTicket, ticketName: string) => void
}

const COLUMN_HEADERS = ["Item", "Price", "Quantity", "Total"]

/**
 * Line-by-line breakdown for the selected method. Every figure here is server-priced - the table
 * only renders what priceCart returned.
 */
export function PaymentBreakdownTable({
  breakdown,
  sessionGroups,
  grossSubtotal,
  discountAmount,
  currencyCode,
  onChangeQuantity,
  onRequestRemove,
}: PaymentBreakdownTableProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="20px"
      bg="white"
      overflow="hidden"
      boxShadow="0 10px 24px rgba(15, 23, 42, 0.04)"
    >
      <Box px={4} py={4} borderBottomWidth="1px" borderBottomColor="gray.200" bg="gray.50">
        <HStack justify="space-between" gap={4} flexWrap="wrap">
          <Stack gap={1}>
            <Text fontSize="sm" fontWeight="700" color="gray.600">
              Payment breakdown
            </Text>
            <Text fontSize="lg" fontWeight="800" color="gray.900">
              {breakdown.label}
            </Text>
          </Stack>
          {breakdown.isOrganizerOnly ? (
            <Badge colorPalette="purple" variant="subtle" borderRadius="full" px={3} py={1}>
              Organizer only
            </Badge>
          ) : null}
        </HStack>
      </Box>

      <Stack gap={4} p={4} overflowX="auto">
        <Table.Root variant="line" size="sm" borderColor="gray.200">
          <Table.Header>
            <Table.Row bg="white">
              {COLUMN_HEADERS.map((header, index) => (
                <Table.ColumnHeader
                  key={header}
                  borderColor="gray.200"
                  px={4}
                  py={3}
                  color="gray.600"
                  fontSize="xs"
                  textTransform="uppercase"
                  letterSpacing="0.12em"
                  textAlign={index === COLUMN_HEADERS.length - 1 ? "right" : "left"}
                >
                  {header}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {sessionGroups.map((sessionGroup, sessionIndex) => (
              <Fragment key={sessionGroup.sessionId}>
                <Table.Row bg="gray.50">
                  <Table.Cell borderColor="gray.200" px={4} py={3} colSpan={4}>
                    <Stack gap={0.5} minW={0}>
                      <Text fontWeight="800" color="gray.900" lineHeight="1.4" whiteSpace="normal" wordBreak="break-word">
                        {sessionGroup.sessionName}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {sessionGroup.items.length}{" "}
                        {sessionGroup.items.length === 1 ? "ticket type selected" : "ticket types selected"}
                      </Text>
                    </Stack>
                  </Table.Cell>
                </Table.Row>

                {sessionGroup.items.map((item) => (
                  <Table.Row key={item.ticketId}>
                    <Table.Cell borderColor="gray.200" px={4} py={3}>
                      <Text fontWeight="700" color="gray.900" lineHeight="1.4" whiteSpace="normal" wordBreak="break-word">
                        {item.ticketName}
                      </Text>
                    </Table.Cell>
                    <Table.Cell borderColor="gray.200" px={4} py={3}>
                      <Text fontWeight="700" color="gray.800">
                        {formatAmount(item.unitPrice, currencyCode)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell borderColor="gray.200" px={4} py={3}>
                      <TicketQuantityStepper
                        ticket={item.ticket}
                        ticketName={item.ticketName}
                        quantity={item.quantity}
                        onChangeQuantity={(quantity) => onChangeQuantity(item.ticket, quantity)}
                        onRequestRemove={() => onRequestRemove(item.ticket, item.ticketName)}
                      />
                    </Table.Cell>
                    <Table.Cell borderColor="gray.200" px={4} py={3} textAlign="right">
                      <Text fontWeight="700" color="gray.900">
                        {formatAmount(item.lineTotal, currencyCode)}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}

                {sessionIndex < sessionGroups.length - 1 ? (
                  <Table.Row>
                    <Table.Cell borderColor="gray.200" px={4} py={0} colSpan={4}>
                      <Separator borderColor="gray.200" />
                    </Table.Cell>
                  </Table.Row>
                ) : null}
              </Fragment>
            ))}

            <Table.Row bg="gray.50">
              <Table.Cell borderColor="gray.200" px={4} py={3}>
                <Text fontWeight="800" color="gray.900">
                  Subtotal
                </Text>
              </Table.Cell>
              <Table.Cell borderColor="gray.200" px={4} py={3} />
              <Table.Cell borderColor="gray.200" px={4} py={3} />
              <Table.Cell borderColor="gray.200" px={4} py={3} textAlign="right">
                <Text fontSize="lg" fontWeight="800" color="gray.900">
                  {formatAmount(grossSubtotal, currencyCode)}
                </Text>
              </Table.Cell>
            </Table.Row>

            {discountAmount > 0 ? (
              <>
                <Table.Row>
                  <Table.Cell borderColor="gray.200" px={4} py={3}>
                    <Text fontWeight="700" color="green.700">
                      Coupon discount
                    </Text>
                  </Table.Cell>
                  <Table.Cell borderColor="gray.200" px={4} py={3} />
                  <Table.Cell borderColor="gray.200" px={4} py={3} />
                  <Table.Cell borderColor="gray.200" px={4} py={3} textAlign="right">
                    <Text fontWeight="700" color="green.700">
                      -{formatAmount(discountAmount, currencyCode)}
                    </Text>
                  </Table.Cell>
                </Table.Row>

                {/* Percentage charges below are rated on this, not on the gross - without it the rates
                    printed beside them do not reconcile against any figure on the table. */}
                <Table.Row bg="gray.50">
                  <Table.Cell borderColor="gray.200" px={4} py={3}>
                    <Text fontWeight="800" color="gray.900">
                      Subtotal after discount
                    </Text>
                  </Table.Cell>
                  <Table.Cell borderColor="gray.200" px={4} py={3} />
                  <Table.Cell borderColor="gray.200" px={4} py={3} />
                  <Table.Cell borderColor="gray.200" px={4} py={3} textAlign="right">
                    <Text fontWeight="800" color="gray.900">
                      {formatAmount(breakdown.subtotal, currencyCode)}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              </>
            ) : null}

            {breakdown.charges.length > 0 ? (
              breakdown.charges.map((charge) => (
                <Table.Row key={`${breakdown.paymentMethod}-${charge.source}-${charge.title}`}>
                  <Table.Cell borderColor="gray.200" px={4} py={3}>
                    <Text fontWeight="700" color="gray.900">
                      {charge.title}
                    </Text>
                  </Table.Cell>
                  <Table.Cell borderColor="gray.200" px={4} py={3}>
                    <Text fontWeight="700" color="gray.800">
                      {formatChargeRate(charge.valueType, charge.value, currencyCode)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell borderColor="gray.200" px={4} py={3} textAlign="center">
                    <Text fontWeight="700" color="gray.800">
                      &nbsp;
                    </Text>
                  </Table.Cell>
                  <Table.Cell borderColor="gray.200" px={4} py={3} textAlign="right">
                    <Text fontWeight="700" color="gray.900">
                      {formatAmount(charge.amount, currencyCode)}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))
            ) : (
              <Table.Row>
                <Table.Cell borderColor="gray.200" px={4} py={3} colSpan={4}>
                  <Text fontSize="sm" color="gray.600">
                    No additional buyer charges apply for this method.
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}

            <Table.Row bg="gray.50">
              <Table.Cell borderColor="gray.200" px={4} py={3}>
                <Text fontWeight="800" color="gray.900">
                  Total payable
                </Text>
              </Table.Cell>
              <Table.Cell borderColor="gray.200" px={4} py={3} />
              <Table.Cell borderColor="gray.200" px={4} py={3} />
              <Table.Cell borderColor="gray.200" px={4} py={3} textAlign="right">
                <Text fontSize="lg" fontWeight="800" color="gray.900">
                  {formatAmount(breakdown.grandTotal, currencyCode)}
                </Text>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Stack>
    </Box>
  )
}

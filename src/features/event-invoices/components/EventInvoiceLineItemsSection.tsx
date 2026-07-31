import { Badge, Box, Heading, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import type { EventInvoiceLineItem } from "@/api/eventInvoices"

interface EventInvoiceLineItemsSectionProps {
  lineItems: EventInvoiceLineItem[]
  currencySymbol: string
}

const TICKET_STATUS_COLOR: Record<string, string> = {
  Active: "green",
  CheckedIn: "blue",
  Cancelled: "gray",
  Refunded: "red",
}

function formatMoney(value: number, currencySymbol: string) {
  return `${currencySymbol}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

function formatTimestamp(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : format(parsed, "MMM d, yyyy h:mm a")
}

function LineItemCard({ item, currencySymbol }: { item: EventInvoiceLineItem; currencySymbol: string }) {
  return (
    <Box border="1px solid" borderColor="gray.200" borderRadius="16px" overflow="hidden">
      <Box px={4} py={3} bg="gray.50" borderBottomWidth="1px" borderBottomColor="gray.200">
        <HStack justify="space-between" wrap="wrap" gap={2}>
          <Stack gap={0}>
            <Text fontWeight="700" color="gray.900">
              {item.ticketTypeName}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {item.sessionName}
            </Text>
          </Stack>
          <Text fontWeight="700" color="gray.900">
            {item.quantity} × {formatMoney(item.unitPrice, currencySymbol)} = {formatMoney(item.lineTotal, currencySymbol)}
          </Text>
        </HStack>
      </Box>

      <Box p={4}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Stack gap={2}>
            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
              Attendees
            </Text>
            {item.attendees.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                No attendee details recorded.
              </Text>
            ) : (
              item.attendees.map((attendee, index) => (
                <Text key={`${attendee.name}-${index}`} fontSize="sm" color="gray.700">
                  {attendee.name}
                  {attendee.email ? ` · ${attendee.email}` : ""}
                  {attendee.phone ? ` · ${attendee.phone}` : ""}
                </Text>
              ))
            )}
          </Stack>

          <Stack gap={2}>
            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
              Issued tickets
            </Text>
            {item.tickets.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                No ticket issued yet - payment has not settled.
              </Text>
            ) : (
              item.tickets.map((ticket) => (
                <HStack key={ticket.ticketUniqueId} gap={2} wrap="wrap">
                  <Text fontSize="sm" fontFamily="mono" color="gray.700">
                    {ticket.ticketCode}
                  </Text>
                  <Badge colorPalette={TICKET_STATUS_COLOR[ticket.ticketStatus] ?? "gray"} variant="subtle" borderRadius="full" px={2} py={0.5} fontSize="xs">
                    {ticket.ticketStatus}
                  </Badge>
                  {ticket.deliveredAtUtc ? (
                    <Text fontSize="xs" color="gray.500">
                      Delivered {formatTimestamp(ticket.deliveredAtUtc)}
                    </Text>
                  ) : (
                    <Text fontSize="xs" color="orange.600">
                      Not delivered
                    </Text>
                  )}
                  {ticket.checkedInAtUtc ? (
                    <Text fontSize="xs" color="gray.500">
                      Checked in {formatTimestamp(ticket.checkedInAtUtc)}
                    </Text>
                  ) : null}
                </HStack>
              ))
            )}
          </Stack>
        </SimpleGrid>
      </Box>
    </Box>
  )
}

export function EventInvoiceLineItemsSection({ lineItems, currencySymbol }: EventInvoiceLineItemsSectionProps) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      <Heading fontSize="lg" fontWeight="800" color="gray.900" mb={4}>
        Ticket line items
      </Heading>

      {lineItems.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No ticket lines on this invoice.
        </Text>
      ) : (
        <Stack gap={4}>
          {lineItems.map((item) => (
            <LineItemCard key={item.invoiceItemUniqueId} item={item} currencySymbol={currencySymbol} />
          ))}
        </Stack>
      )}
    </Box>
  )
}

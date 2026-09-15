import { Box, Heading, HStack, IconButton, Table, Text } from "@chakra-ui/react"
import { Eye, Send } from "lucide-react"
import type { EventInvoiceLineItem } from "@/api/eventInvoices"
import { formatCurrency } from "@/utils/format"

interface EventInvoiceItemsTableProps {
  lineItems: EventInvoiceLineItem[]
  currencySymbol: string
  /** Called when the organizer opens the attendee detail modal for a row. */
  onViewAttendees?: (item: EventInvoiceLineItem) => void
  /** Called when the organizer initiates a bulk resend for all tickets on a row. */
  onResendRow?: (item: EventInvoiceLineItem) => void
}

const SEAT_PREVIEW_LIMIT = 4

interface SessionGroup {
  sessionUniqueId: string
  sessionName: string
  items: EventInvoiceLineItem[]
}

/** Line items gathered under the session that sold them, first-seen order kept, so a session names itself once instead of on every row. */
function groupBySession(lineItems: EventInvoiceLineItem[]): SessionGroup[] {
  const groups: SessionGroup[] = []
  const indexBySession = new Map<string, number>()
  for (const item of lineItems) {
    const existing = indexBySession.get(item.sessionUniqueId)
    if (existing === undefined) {
      indexBySession.set(item.sessionUniqueId, groups.length)
      groups.push({ sessionUniqueId: item.sessionUniqueId, sessionName: item.sessionName, items: [item] })
      continue
    }
    groups[existing].items.push(item)
  }
  return groups
}

/** The seat labels billed on a line, in issue order, skipping general-admission tickets that name no seat. */
function seatLabelsOf(item: EventInvoiceLineItem): string[] {
  return item.tickets
    .map((ticket) => ticket.seatObjectLabel)
    .filter((label): label is string => Boolean(label))
}

/** Seats shown inline, a long list collapsed to the first few plus a count, so a big table never stretches its row; the full list rides on the title for the reader who wants every seat. */
function seatSummary(labels: string[]): { text: string; title: string | undefined } {
  if (labels.length === 0) return { text: "-", title: undefined }
  if (labels.length <= SEAT_PREVIEW_LIMIT) return { text: labels.join(", "), title: undefined }
  const shown = labels.slice(0, SEAT_PREVIEW_LIMIT - 1)
  return { text: `${shown.join(", ")} +${labels.length - shown.length}`, title: labels.join(", ") }
}

/** The priced breakdown of what's billed - sits between who it's billed to and what it totals. */
export function EventInvoiceItemsTable({ lineItems, currencySymbol, onViewAttendees, onResendRow }: EventInvoiceItemsTableProps) {
  if (lineItems.length === 0) {
    return (
      <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" overflow="hidden">
        <Box px={4} py={3} bg="app.bg" borderBottomWidth="1px" borderBottomColor="border.subtle">
          <Heading as="h2" fontSize="lg" fontWeight="800" color="text.primary">
            Charges
          </Heading>
        </Box>
        <Box p={4}>
          <Text fontSize="sm" color="text.secondary">
            No line items on this invoice.
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" overflow="hidden">
      <Box px={4} py={3} bg="app.bg" borderBottomWidth="1px" borderBottomColor="border.subtle">
        <Heading as="h2" fontSize="lg" fontWeight="800" color="text.primary">
          Charges
        </Heading>
      </Box>
      <Box overflowX="auto">
        <Table.Root variant="line" size="md">
        <Table.Caption srOnly>Every ticket type billed on this invoice, grouped by session</Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader px={4} fontWeight="700" color="text.primary">Description</Table.ColumnHeader>
            <Table.ColumnHeader px={4} fontWeight="700" color="text.primary">Seats</Table.ColumnHeader>
            <Table.ColumnHeader px={4} fontWeight="700" color="text.primary" textAlign="right">Qty</Table.ColumnHeader>
            <Table.ColumnHeader px={4} fontWeight="700" color="text.primary" textAlign="right">Rate</Table.ColumnHeader>
            <Table.ColumnHeader px={4} fontWeight="700" color="text.primary" textAlign="right">Amount</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {groupBySession(lineItems).flatMap((group, groupIndex) => [
            <Table.Row
              key={`session-${group.sessionUniqueId}`}
              bg="app.bg"
              borderTopWidth={groupIndex === 0 ? 0 : "2px"}
              borderTopColor="border.subtle"
            >
              <Table.Cell colSpan={5} px={4} py={2} verticalAlign="middle">
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="text.secondary"
                  textTransform="uppercase"
                  letterSpacing="0.08em"
                >
                  {group.sessionName}
                </Text>
              </Table.Cell>
            </Table.Row>,
            ...group.items.map((item) => {
              const seats = seatSummary(seatLabelsOf(item))
              return (
                <Table.Row key={item.invoiceItemUniqueId}>
                  <Table.Cell color="text.primary" fontWeight="600" pl={8} pr={4} py={3}>
                    {item.ticketTypeName}
                  </Table.Cell>
                  <Table.Cell color="text.primary" fontFamily="mono" minW="120px" title={seats.title} px={4} py={3}>
                    {seats.text}
                  </Table.Cell>
                  <Table.Cell textAlign="right" color="text.primary" fontVariantNumeric="tabular-nums" px={4} py={3}>
                    <HStack gap={0.5} justify="flex-end" align="center">
                      <Text fontVariantNumeric="tabular-nums">{item.quantity}</Text>
                      {onViewAttendees ? (
                        <IconButton
                          aria-label={`View attendees for ${item.ticketTypeName}`}
                          size="xs"
                          variant="ghost"
                          colorPalette="brand"
                          borderRadius="6px"
                          minH="6"
                          minW="6"
                          cursor="pointer"
                          onClick={() => onViewAttendees(item)}
                        >
                          <Eye size={12} />
                        </IconButton>
                      ) : null}
                      {onResendRow && item.tickets.length > 0 ? (
                        <IconButton
                          aria-label={`Send all tickets for ${item.ticketTypeName}`}
                          size="xs"
                          variant="ghost"
                          colorPalette="brand"
                          borderRadius="6px"
                          minH="6"
                          minW="6"
                          cursor="pointer"
                          onClick={() => onResendRow(item)}
                        >
                          <Send size={12} />
                        </IconButton>
                      ) : null}
                    </HStack>
                  </Table.Cell>
                  <Table.Cell textAlign="right" color="text.primary" fontVariantNumeric="tabular-nums" px={4} py={3}>
                    {formatCurrency(item.unitPrice, currencySymbol)}
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="700" color="text.primary" fontVariantNumeric="tabular-nums" px={4} py={3}>
                    {formatCurrency(item.lineTotal, currencySymbol)}
                  </Table.Cell>
                </Table.Row>
              )
            }),
          ])}
        </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  )
}

import { Box, Table, Text } from "@chakra-ui/react"
import type { EventInvoiceLineItem } from "@/api/eventInvoices"
import { formatCurrency } from "@/utils/format"

interface EventInvoiceItemsTableProps {
  lineItems: EventInvoiceLineItem[]
  currencySymbol: string
}

/** The priced breakdown of what's billed - sits between who it's billed to and what it totals. */
export function EventInvoiceItemsTable({ lineItems, currencySymbol }: EventInvoiceItemsTableProps) {
  if (lineItems.length === 0) {
    return (
      <Text fontSize="sm" color="text.secondary">
        No line items on this invoice.
      </Text>
    )
  }

  return (
    <Box overflowX="auto">
      <Table.Root variant="line" size="sm">
        <Table.Caption srOnly>Every ticket type billed on this invoice</Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Description</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Qty</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Rate</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Amount</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {lineItems.map((item) => (
            <Table.Row key={item.invoiceItemUniqueId}>
              <Table.Cell>
                <Text fontWeight="700" color="text.primary">
                  {item.ticketTypeName}
                </Text>
                <Text fontSize="xs" color="text.secondary">
                  {item.sessionName}
                </Text>
              </Table.Cell>
              <Table.Cell textAlign="right" color="text.secondary">
                {item.quantity}
              </Table.Cell>
              <Table.Cell textAlign="right" color="text.secondary">
                {formatCurrency(item.unitPrice, currencySymbol)}
              </Table.Cell>
              <Table.Cell textAlign="right" fontWeight="700" color="text.primary">
                {formatCurrency(item.lineTotal, currencySymbol)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}

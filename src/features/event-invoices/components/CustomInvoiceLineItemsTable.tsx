import { Box, Heading, Table, Text } from "@chakra-ui/react"
import type { CustomInvoiceLineItem } from "@/api/customInvoices"
import { formatCurrency, sumMoney } from "@/utils/format"

interface CustomInvoiceLineItemsTableProps {
  lineItems: CustomInvoiceLineItem[]
  currencySymbol: string
}

/** The Description/Amount lines of a custom invoice with an exact grand total - no tickets, seats or attendees. */
export function CustomInvoiceLineItemsTable({ lineItems, currencySymbol }: CustomInvoiceLineItemsTableProps) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" overflow="hidden">
      <Box px={4} py={3} bg="app.bg" borderBottomWidth="1px" borderBottomColor="border.subtle">
        <Heading as="h2" fontSize="lg" fontWeight="800" color="text.primary">
          Charges
        </Heading>
      </Box>

      {lineItems.length === 0 ? (
        <Box p={4}>
          <Text fontSize="sm" color="text.secondary">
            No line items on this invoice.
          </Text>
        </Box>
      ) : (
        <Box overflowX="auto">
          <Table.Root variant="line" size="md">
            <Table.Caption srOnly>Every line billed on this custom invoice</Table.Caption>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader px={4} fontWeight="700" color="text.primary">
                  Description
                </Table.ColumnHeader>
                <Table.ColumnHeader px={4} fontWeight="700" color="text.primary" textAlign="right">
                  Amount
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {lineItems.map((item) => (
                <Table.Row key={item.invoiceItemUniqueId}>
                  <Table.Cell color="text.primary" fontWeight="600" px={4} py={3} whiteSpace="pre-wrap">
                    {item.description}
                  </Table.Cell>
                  <Table.Cell
                    textAlign="right"
                    fontWeight="700"
                    color="text.primary"
                    fontVariantNumeric="tabular-nums"
                    px={4}
                    py={3}
                  >
                    {formatCurrency(item.amount, currencySymbol)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
            <Table.Footer>
              <Table.Row bg="app.bg">
                <Table.Cell px={4} py={3} fontSize="md" fontWeight="800" color="text.primary">
                  Grand total
                </Table.Cell>
                <Table.Cell
                  textAlign="right"
                  px={4}
                  py={3}
                  fontSize="md"
                  fontWeight="900"
                  color="text.primary"
                  fontVariantNumeric="tabular-nums"
                >
                  {formatCurrency(sumMoney(lineItems.map((item) => item.amount)), currencySymbol)}
                </Table.Cell>
              </Table.Row>
            </Table.Footer>
          </Table.Root>
        </Box>
      )}
    </Box>
  )
}

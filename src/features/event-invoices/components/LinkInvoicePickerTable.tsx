import { useId } from "react"
import { Box, Table, Text, chakra } from "@chakra-ui/react"
import type { CustomInvoiceLinkCandidate } from "@/api/customInvoices"
import { EMPTY_VALUE } from "@/utils/format"
import { formatUtcDate } from "@/utils/utcDates"
import { EventInvoiceStatusBadge } from "./EventInvoiceStatusBadge"
import { InvoiceBuyerCell } from "./InvoiceBuyerCell"
import { TableBodySkeleton } from "./TableBodySkeleton"

interface LinkInvoicePickerTableProps {
  invoices: CustomInvoiceLinkCandidate[]
  isFetching: boolean
  selectedInvoiceUniqueId: string | null
  emptyMessage: string
  onSelect: (invoice: CustomInvoiceLinkCandidate) => void
}

const COLUMN_COUNT = 5

const HEADER_TEXT_PROPS = {
  fontSize: "xs",
  fontWeight: "700",
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
} as const

/** One page of candidate invoices; picking a row is a single-choice radio so keyboard and screen readers get it for free. */
export function LinkInvoicePickerTable({
  invoices,
  isFetching,
  selectedInvoiceUniqueId,
  emptyMessage,
  onSelect,
}: LinkInvoicePickerTableProps) {
  const radioGroupName = useId()

  return (
    <Box overflowX="auto">
      <Table.Root size="sm" minW="560px">
        <Table.Caption srOnly>Invoices this invoice can be linked to</Table.Caption>
        <Table.Header>
          <Table.Row bg="app.bg">
            <Table.ColumnHeader px={3} py={3} w="1%">
              <Text srOnly>Select</Text>
            </Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={3}>
              <Text {...HEADER_TEXT_PROPS}>Invoice No</Text>
            </Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={3}>
              <Text {...HEADER_TEXT_PROPS}>Buyer</Text>
            </Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={3}>
              <Text {...HEADER_TEXT_PROPS}>Date</Text>
            </Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={3}>
              <Text {...HEADER_TEXT_PROPS}>Status</Text>
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        {isFetching ? (
          <TableBodySkeleton columns={COLUMN_COUNT} rows={Math.max(invoices.length, 3)} />
        ) : (
          <Table.Body>
            {invoices.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={COLUMN_COUNT} py={10}>
                  <Text textAlign="center" fontSize="sm" color="text.secondary">
                    {emptyMessage}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              invoices.map((invoice) => {
                const isSelected = invoice.invoiceUniqueId === selectedInvoiceUniqueId
                return (
                  <Table.Row
                    key={invoice.invoiceUniqueId}
                    cursor="pointer"
                    bg={isSelected ? "brand.50" : undefined}
                    _hover={{ bg: isSelected ? "brand.50" : "app.bg" }}
                    onClick={() => onSelect(invoice)}
                  >
                    <Table.Cell px={1} py={0}>
                      <chakra.label display="flex" alignItems="center" justifyContent="center" minW="11" minH="11" cursor="pointer">
                        <chakra.input
                          type="radio"
                          name={radioGroupName}
                          checked={isSelected}
                          onChange={() => onSelect(invoice)}
                          aria-label={`Select invoice ${invoice.invoiceNo}`}
                          w="4"
                          h="4"
                          cursor="pointer"
                          css={{ accentColor: "var(--chakra-colors-brand-600)" }}
                        />
                      </chakra.label>
                    </Table.Cell>
                    <Table.Cell px={3} py={3}>
                      <Text fontSize="sm" fontWeight="700" color="text.primary">
                        {invoice.invoiceNo}
                      </Text>
                    </Table.Cell>
                    <Table.Cell px={3} py={3}>
                      <InvoiceBuyerCell companyName={invoice.companyName} buyerName={invoice.buyerName} buyerEmail={invoice.buyerEmail} />
                    </Table.Cell>
                    <Table.Cell px={3} py={3}>
                      <Text fontSize="sm" color="text.secondary" whiteSpace="nowrap">
                        {formatUtcDate(invoice.invoiceDateUtc) ?? EMPTY_VALUE}
                      </Text>
                    </Table.Cell>
                    <Table.Cell px={3} py={3}>
                      <EventInvoiceStatusBadge status={invoice.invoiceStatus} label={invoice.invoiceStatusLabel} size="sm" />
                    </Table.Cell>
                  </Table.Row>
                )
              })
            )}
          </Table.Body>
        )}
      </Table.Root>
    </Box>
  )
}

import { Badge, Box, Button, Table, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import type { EventInvoiceListItem, EventInvoiceSortBy, EventInvoiceSortOrder } from "@/api/eventInvoices"
import { EVENT_INVOICE_PAYMENT_METHOD_OPTIONS } from "@/api/eventInvoices"
import { SortableColumnHeader } from "./SortableColumnHeader"
import { TableBodySkeleton } from "./TableBodySkeleton"
import { STICKY_HEADER_CSS, TABLE_MAX_HEIGHT } from "../constants"

interface EventInvoiceTableProps {
  invoices: EventInvoiceListItem[]
  sortBy: EventInvoiceSortBy
  sortOrder: EventInvoiceSortOrder
  isFetching: boolean
  onSortChange: (sortBy: EventInvoiceSortBy) => void
  onOpenDetail: (invoice: EventInvoiceListItem) => void
}

const STATUS_COLOR: Record<string, string> = {
  Paid: "green",
  PartiallyPaid: "yellow",
  PendingPayment: "orange",
  Cancelled: "gray",
  Refund: "purple",
  PartiallyRefunded: "purple",
  AdjustedInSystem: "blue",
  Failed: "red",
}

function formatDate(value: string) {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "MMM d, yyyy")
}

function formatMoney(value: number, currencySymbol: string) {
  return `${currencySymbol}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

function paymentMethodLabel(value: string | null) {
  if (!value) return "—"
  return EVENT_INVOICE_PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value
}

const COLUMN_COUNT = 7

export function EventInvoiceTable({
  invoices,
  sortBy,
  sortOrder,
  isFetching,
  onSortChange,
  onOpenDetail,
}: EventInvoiceTableProps) {
  return (
    <Box overflow="auto" maxH={TABLE_MAX_HEIGHT}>
      <Table.Root
        variant="line"
        size="sm"
        css={{
          borderCollapse: "separate",
          borderSpacing: 0,
          "& th, & td": { border: "1px solid", borderColor: "gray.300" },
          ...STICKY_HEADER_CSS("app.bg"),
        }}
      >
        <Table.Header>
          <Table.Row bg="app.bg">
            <Table.ColumnHeader px={4} py={3}>
              <SortableColumnHeader label="Invoice No" column="invoiceNo" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3}>
              <SortableColumnHeader label="Event" column="eventName" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3}>
              <SortableColumnHeader label="Buyer" column="buyerName" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3} textAlign="center">
              <SortableColumnHeader label="Status" column="invoiceStatus" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} justify="center" />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3} textAlign="center">
              <SortableColumnHeader label="Date" column="invoiceDateUtc" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} justify="center" />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3} textAlign="right">
              <SortableColumnHeader label="Total" column="totalAmount" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} justify="flex-end" />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3} textAlign="center">
              Payment Method
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        {isFetching ? (
          <TableBodySkeleton columns={COLUMN_COUNT} rows={Math.max(invoices.length, 3)} />
        ) : (
          <Table.Body>
            {invoices.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={COLUMN_COUNT} py={14}>
                  <Box textAlign="center">
                    <Text fontSize="lg" fontWeight="700" color="gray.900">
                      No invoices found
                    </Text>
                    <Text mt={2} fontSize="sm" color="gray.600">
                      Try adjusting the filters above.
                    </Text>
                  </Box>
                </Table.Cell>
              </Table.Row>
            ) : (
              invoices.map((invoice) => (
                <Table.Row key={invoice.invoiceUniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                  <Table.Cell px={4} py={4}>
                    <Button
                      type="button"
                      variant="plain"
                      h="auto"
                      p={0}
                      fontSize="sm"
                      fontWeight="700"
                      color="brand.600"
                      cursor="pointer"
                      justifyContent="flex-start"
                      _hover={{ textDecoration: "underline" }}
                      onClick={() => onOpenDetail(invoice)}
                    >
                      {invoice.invoiceNo}
                    </Button>
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Text fontSize="sm" color="text.primary">
                      {invoice.eventName}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Text fontSize="sm" fontWeight="600" color="text.primary">
                      {invoice.buyerName || "—"}
                    </Text>
                    {invoice.buyerEmail ? (
                      <Text fontSize="xs" color="text.secondary">
                        {invoice.buyerEmail}
                      </Text>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell px={4} py={4} textAlign="center">
                    <Badge colorPalette={STATUS_COLOR[invoice.invoiceStatus] ?? "gray"} variant="subtle" borderRadius="full" px={3} py={1}>
                      {invoice.invoiceStatusLabel}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} textAlign="center">
                    <Text fontSize="sm" color="text.secondary">
                      {formatDate(invoice.invoiceDateUtc)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} textAlign="right">
                    <Text fontSize="sm" fontWeight="700" color="text.primary">
                      {formatMoney(invoice.totalAmount, invoice.currencySymbol)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} textAlign="center">
                    <Text fontSize="sm" color="text.secondary">
                      {paymentMethodLabel(invoice.paymentMethod)}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        )}
      </Table.Root>
    </Box>
  )
}

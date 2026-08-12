import { Box, Link, Table, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import { Link as RouterLink } from "react-router-dom"
import type { EventInvoiceListItem, EventInvoiceSortBy, EventInvoiceSortOrder } from "@/api/eventInvoices"
import { APP_ROUTES } from "@/utils/routes"
import { EMPTY_VALUE, formatCurrency } from "@/utils/format"
import { parseUtcDateTime } from "@/utils/utcDates"
import { useInvoiceListReturnState } from "../hooks/useInvoiceListReturnState"
import { EventInvoiceRowActionsMenu } from "./EventInvoiceRowActionsMenu"
import { EventInvoiceStatusBadge } from "./EventInvoiceStatusBadge"
import { PaymentPills } from "./PaymentPills"
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
  onResendTickets: (invoice: EventInvoiceListItem) => void
}

function formatDate(value: string) {
  const parsed = parseUtcDateTime(value)
  return parsed ? format(parsed, "MMM d, yyyy") : EMPTY_VALUE
}

const COLUMN_COUNT = 7

export function EventInvoiceTable({
  invoices,
  sortBy,
  sortOrder,
  isFetching,
  onSortChange,
  onOpenDetail,
  onResendTickets,
}: EventInvoiceTableProps) {
  const returnState = useInvoiceListReturnState()

  return (
    <Box overflow="auto" maxH={TABLE_MAX_HEIGHT}>
      <Table.Root
        variant="line"
        size="sm"
        css={{
          borderCollapse: "separate",
          borderSpacing: 0,
          "& th, & td": { border: "1px solid", borderColor: "border.subtle" },
          ...STICKY_HEADER_CSS("app.bg"),
        }}
      >
        <Table.Caption srOnly>Event invoices matching the current filters</Table.Caption>
        <Table.Header>
          <Table.Row bg="app.bg">
            <Table.ColumnHeader px={4} py={3} textAlign="center" w="1%">
              <Text fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.06em">
                Actions
              </Text>
            </Table.ColumnHeader>
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
                    <Text fontSize="lg" fontWeight="700" color="text.primary">
                      No invoices found
                    </Text>
                    <Text mt={2} fontSize="sm" color="text.secondary">
                      Try adjusting the filters above.
                    </Text>
                  </Box>
                </Table.Cell>
              </Table.Row>
            ) : (
              invoices.map((invoice) => (
                <Table.Row key={invoice.invoiceUniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                  <Table.Cell px={4} py={4} textAlign="center">
                    <EventInvoiceRowActionsMenu
                      invoice={invoice}
                      onOpenDetail={onOpenDetail}
                      onResendTickets={onResendTickets}
                    />
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Link
                      asChild
                      fontSize="sm"
                      fontWeight="700"
                      color="brand.600"
                      cursor="pointer"
                      display="inline-flex"
                      minH="11"
                      alignItems="center"
                      _hover={{ textDecoration: "underline" }}
                    >
                      <RouterLink to={APP_ROUTES.eventInvoices.detail(invoice.invoiceUniqueId)} state={returnState}>
                        {invoice.invoiceNo}
                      </RouterLink>
                    </Link>
                    <PaymentPills paymentMethod={invoice.paymentMethod} paymentSource={invoice.paymentSource} />
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Text fontSize="sm" color="text.primary">
                      {invoice.eventName}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Text fontSize="sm" fontWeight="600" color="text.primary">
                      {invoice.buyerName || EMPTY_VALUE}
                    </Text>
                    {invoice.buyerEmail ? (
                      <Text fontSize="xs" color="text.secondary">
                        {invoice.buyerEmail}
                      </Text>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell px={4} py={4} textAlign="center">
                    <EventInvoiceStatusBadge
                      status={invoice.invoiceStatus}
                      label={invoice.invoiceStatusLabel}
                      size="sm"
                    />
                  </Table.Cell>
                  <Table.Cell px={4} py={4} textAlign="center">
                    <Text fontSize="sm" color="text.secondary">
                      {formatDate(invoice.invoiceDateUtc)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} textAlign="right">
                    <Text fontSize="sm" fontWeight="700" color="text.primary">
                      {formatCurrency(invoice.totalAmount, invoice.currencySymbol)}
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

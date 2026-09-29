import { Box, Flex, Link, Table, Text, VisuallyHidden } from "@chakra-ui/react"
import { AlertTriangle } from "lucide-react"
import { Link as RouterLink } from "react-router-dom"
import type { EventInvoiceListItem, EventInvoiceSortBy, EventInvoiceSortOrder } from "@/api/eventInvoices"
import { TextPill } from "@/components/common"
import { APP_ROUTES } from "@/utils/routes"
import { EMPTY_VALUE, formatCurrency } from "@/utils/format"
import { formatUtcDate } from "@/utils/utcDates"
import { useInvoiceListReturnState } from "../hooks/useInvoiceListReturnState"
import { EventInvoiceRowActionsMenu } from "./EventInvoiceRowActionsMenu"
import { EventInvoiceStatusBadge } from "./EventInvoiceStatusBadge"
import { InvoiceBuyerCell } from "./InvoiceBuyerCell"
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
  onEdit: (invoice: EventInvoiceListItem) => void
  onMarkPaid: (invoice: EventInvoiceListItem) => void
  onCancel: (invoice: EventInvoiceListItem) => void
  onSend: (invoice: EventInvoiceListItem) => void
}

const COLUMN_COUNT = 8

function DueDateCell({ invoice }: { invoice: EventInvoiceListItem }) {
  if (!invoice.dueDateUtc) {
    return (
      <Text fontSize="sm" color="text.secondary">
        {EMPTY_VALUE}
      </Text>
    )
  }

  const dueDate = formatUtcDate(invoice.dueDateUtc) ?? EMPTY_VALUE

  if (!invoice.isOverdue) {
    return (
      <Text fontSize="sm" color="text.secondary">
        {dueDate}
      </Text>
    )
  }

  return (
    <Flex
      display="inline-flex"
      align="center"
      gap={1}
      px={2.5}
      py={1}
      borderRadius="999px"
      bg="status.warning.bg"
      color="status.warning.fg"
    >
      <AlertTriangle size={14} aria-hidden />
      <Text as="span" fontSize="sm" fontWeight="700">
        <VisuallyHidden>Overdue, due </VisuallyHidden>
        {dueDate}
      </Text>
    </Flex>
  )
}

export function EventInvoiceTable({
  invoices,
  sortBy,
  sortOrder,
  isFetching,
  onSortChange,
  onOpenDetail,
  onEdit,
  onMarkPaid,
  onCancel,
  onSend,
}: EventInvoiceTableProps) {
  const returnState = useInvoiceListReturnState()

  return (
    // The overdue pill's visually hidden text is absolutely positioned; without a positioned scroller it escapes the
    // overflow box and widens the whole page on narrow screens.
    <Box overflow="auto" maxH={TABLE_MAX_HEIGHT} position="relative">
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
            <Table.ColumnHeader px={4} py={0}>
              <SortableColumnHeader label="Invoice No" column="invoiceNo" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={0}>
              <SortableColumnHeader label="Event" column="eventName" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={0}>
              <SortableColumnHeader label="Buyer" column="buyerName" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={0} textAlign="center">
              <SortableColumnHeader label="Status" column="invoiceStatus" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} justify="center" />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={0} textAlign="center">
              <SortableColumnHeader label="Date" column="invoiceDateUtc" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} justify="center" />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={0} textAlign="center">
              <SortableColumnHeader label="Due date" column="dueDateUtc" activeSortBy={sortBy} activeSortOrder={sortOrder} onSortChange={onSortChange} justify="center" />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={0} textAlign="right">
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
                      onEdit={onEdit}
                      onMarkPaid={onMarkPaid}
                      onCancel={onCancel}
                      onSend={onSend}
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
                    {invoice.invoiceType === "Custom" ? (
                      <Box mt={1}>
                        <TextPill colorPalette="brand">Custom</TextPill>
                      </Box>
                    ) : null}
                    <PaymentPills paymentMethod={invoice.paymentMethod} paymentSource={invoice.paymentSource} />
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Text fontSize="sm" color="text.primary">
                      {invoice.eventName}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <InvoiceBuyerCell companyName={invoice.companyName} buyerName={invoice.buyerName} buyerEmail={invoice.buyerEmail} />
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
                      {formatUtcDate(invoice.invoiceDateUtc) ?? EMPTY_VALUE}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} textAlign="center">
                    <DueDateCell invoice={invoice} />
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

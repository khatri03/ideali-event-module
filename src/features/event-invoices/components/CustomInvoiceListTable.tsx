import { Box, Table, Text } from "@chakra-ui/react"
import type { CustomInvoiceListItem } from "@/api/customInvoices"
import { TextPill } from "@/components/common"
import { EMPTY_VALUE, formatCurrency } from "@/utils/format"
import { formatUtcDate } from "@/utils/utcDates"
import { STICKY_HEADER_CSS, TABLE_MAX_HEIGHT } from "../constants"
import { CustomInvoiceListStatusBadge, CustomInvoiceNumberLink, CustomInvoiceRecordName } from "./CustomInvoiceListCells"
import { CustomInvoiceRowActions } from "./CustomInvoiceRowActions"
import { InvoiceBuyerCell } from "./InvoiceBuyerCell"
import { TableBodySkeleton } from "./TableBodySkeleton"

interface CustomInvoiceListTableProps {
  invoices: CustomInvoiceListItem[]
  isLoading: boolean
}

const COLUMNS: { label: string; align?: "center" | "right"; width?: string }[] = [
  { label: "Actions", align: "center", width: "1%" },
  { label: "Invoice No." },
  { label: "Module" },
  { label: "For" },
  { label: "Buyer" },
  { label: "Category" },
  { label: "Due date", align: "center" },
  { label: "Total", align: "right" },
  { label: "Status", align: "center" },
]

function CustomInvoiceListRow({ invoice }: { invoice: CustomInvoiceListItem }) {
  return (
    <Table.Row _hover={{ bg: "app.bg" }} transition="background 0.15s">
      <Table.Cell px={4} py={4} textAlign="center">
        <CustomInvoiceRowActions invoice={invoice} />
      </Table.Cell>
      <Table.Cell px={4} py={4}>
        <CustomInvoiceNumberLink invoiceUniqueId={invoice.invoiceUniqueId} invoiceNo={invoice.invoiceNo} />
      </Table.Cell>
      <Table.Cell px={4} py={4}>
        <TextPill colorPalette="brand">{invoice.moduleType}</TextPill>
      </Table.Cell>
      <Table.Cell px={4} py={4}>
        <CustomInvoiceRecordName entityName={invoice.entityName} />
      </Table.Cell>
      <Table.Cell px={4} py={4}>
        <InvoiceBuyerCell companyName={invoice.companyName} buyerName={invoice.buyerName} buyerEmail={invoice.buyerEmail} />
      </Table.Cell>
      <Table.Cell px={4} py={4}>
        <Text fontSize="sm" color="text.primary">
          {invoice.categoryName || EMPTY_VALUE}
        </Text>
      </Table.Cell>
      <Table.Cell px={4} py={4} textAlign="center">
        <Text fontSize="sm" color="text.secondary">
          {formatUtcDate(invoice.dueDateUtc) ?? EMPTY_VALUE}
        </Text>
      </Table.Cell>
      <Table.Cell px={4} py={4} textAlign="right">
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          {formatCurrency(invoice.totalAmount, invoice.currencySymbol)}
        </Text>
      </Table.Cell>
      <Table.Cell px={4} py={4} textAlign="center">
        <CustomInvoiceListStatusBadge invoiceStatus={invoice.invoiceStatus} isOverdue={invoice.isOverdue} statusLabel={invoice.statusLabel} />
      </Table.Cell>
    </Table.Row>
  )
}

export function CustomInvoiceListTable({ invoices, isLoading }: CustomInvoiceListTableProps) {
  return (
    // Positioned so absolutely placed descendants stay inside the scroller instead of widening the page.
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
        <Table.Caption srOnly>Custom invoices matching the current filters</Table.Caption>
        <Table.Header>
          <Table.Row bg="app.bg">
            {COLUMNS.map((column) => (
              <Table.ColumnHeader key={column.label} px={4} py={3} textAlign={column.align} w={column.width}>
                <Text fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.06em">
                  {column.label}
                </Text>
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        {isLoading ? (
          <TableBodySkeleton columns={COLUMNS.length} rows={Math.max(invoices.length, 3)} />
        ) : (
          <Table.Body>
            {invoices.map((invoice) => (
              <CustomInvoiceListRow key={invoice.invoiceUniqueId} invoice={invoice} />
            ))}
          </Table.Body>
        )}
      </Table.Root>
    </Box>
  )
}

import { Box, Flex, Stack, Text } from "@chakra-ui/react"
import type { ReactNode } from "react"
import type { CustomInvoiceListItem } from "@/api/customInvoices"
import { TextPill } from "@/components/common"
import { EMPTY_VALUE, formatCurrency } from "@/utils/format"
import { formatUtcDate } from "@/utils/utcDates"
import { CustomInvoiceListStatusBadge, CustomInvoiceNumberLink, CustomInvoiceRecordName } from "./CustomInvoiceListCells"
import { CustomInvoiceRowActions } from "./CustomInvoiceRowActions"
import { InvoiceBuyerCell } from "./InvoiceBuyerCell"

interface CustomInvoiceListCardsProps {
  invoices: CustomInvoiceListItem[]
}

function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box minW={0}>
      <Text fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
      <Box mt={1} wordBreak="break-word">
        {children}
      </Box>
    </Box>
  )
}

function CustomInvoiceListCard({ invoice }: { invoice: CustomInvoiceListItem }) {
  return (
    <Box as="li" listStyleType="none" border="1px solid" borderColor="border.subtle" bg="card.bg" borderRadius="16px" p={4}>
      <Flex justify="space-between" align="flex-start" gap={3}>
        <CustomInvoiceNumberLink invoiceUniqueId={invoice.invoiceUniqueId} invoiceNo={invoice.invoiceNo} />
        <CustomInvoiceRowActions invoice={invoice} />
      </Flex>
      <Flex mt={2} gap={2} align="center" wrap="wrap">
        <TextPill colorPalette="brand">{invoice.moduleType}</TextPill>
        <CustomInvoiceListStatusBadge invoiceStatus={invoice.invoiceStatus} isOverdue={invoice.isOverdue} statusLabel={invoice.statusLabel} />
      </Flex>
      <Stack mt={4} gap={3}>
        <CardField label="For">
          <CustomInvoiceRecordName entityName={invoice.entityName} />
        </CardField>
        <CardField label="Buyer">
          <InvoiceBuyerCell companyName={invoice.companyName} buyerName={invoice.buyerName} buyerEmail={invoice.buyerEmail} />
        </CardField>
        <CardField label="Category">
          <Text fontSize="sm" color="text.primary">
            {invoice.categoryName || EMPTY_VALUE}
          </Text>
        </CardField>
        <Flex gap={4} justify="space-between" wrap="wrap">
          <CardField label="Due date">
            <Text fontSize="sm" color="text.secondary">
              {formatUtcDate(invoice.dueDateUtc) ?? EMPTY_VALUE}
            </Text>
          </CardField>
          <CardField label="Total">
            <Text fontSize="sm" fontWeight="700" color="text.primary">
              {formatCurrency(invoice.totalAmount, invoice.currencySymbol)}
            </Text>
          </CardField>
        </Flex>
      </Stack>
    </Box>
  )
}

/** The narrow-screen form of the list: one card per invoice, every table column kept. */
export function CustomInvoiceListCards({ invoices }: CustomInvoiceListCardsProps) {
  return (
    <Stack as="ul" gap={3} p={4} m={0} aria-label="Custom invoices matching the current filters">
      {invoices.map((invoice) => (
        <CustomInvoiceListCard key={invoice.invoiceUniqueId} invoice={invoice} />
      ))}
    </Stack>
  )
}

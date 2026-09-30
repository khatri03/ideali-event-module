import { SimpleGrid, Text } from "@chakra-ui/react"
import { formatUtcDate } from "@/utils/utcDates"
import { EventInvoicePayableLinkSection } from "./EventInvoicePayableLinkSection"
import { InvoiceDetailPanel, InvoiceMutedLine } from "./InvoiceDetailPanel"

interface CustomInvoiceDetailPanelsProps {
  categoryName: string | null
  dueDateUtc: string | null
  /** Server-decided: unpaid and past due. The panel emphasises it and never re-derives it from the date. */
  isOverdue: boolean
  specialNotes: string | null
  invoiceStatus: string
  invoiceStatusLabel: string
  payPageUrl: string
  canPayOnline: boolean
}

/** The custom-invoice read panels: category, due date with overdue emphasis, special notes and the buyer's payable link. */
export function CustomInvoiceDetailPanels({
  categoryName,
  dueDateUtc,
  isOverdue,
  specialNotes,
  invoiceStatus,
  invoiceStatusLabel,
  payPageUrl,
  canPayOnline,
}: CustomInvoiceDetailPanelsProps) {
  const dueDate = formatUtcDate(dueDateUtc)

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
      <InvoiceDetailPanel title="Category">
        {categoryName ? (
          <Text fontSize="md" fontWeight="800" color="text.primary">
            {categoryName}
          </Text>
        ) : (
          <InvoiceMutedLine>No category</InvoiceMutedLine>
        )}
      </InvoiceDetailPanel>

      <InvoiceDetailPanel title="Due date">
        {dueDate ? (
          <Text fontSize="md" fontWeight="800" color="text.primary">
            {dueDate}
            {isOverdue ? (
              <Text as="span" fontWeight="800" color="status.warning.fg">
                {" · Overdue"}
              </Text>
            ) : null}
          </Text>
        ) : (
          <InvoiceMutedLine>No due date</InvoiceMutedLine>
        )}
      </InvoiceDetailPanel>

      <InvoiceDetailPanel title="Special notes">
        {specialNotes?.trim() ? (
          <Text fontSize="sm" color="text.primary" whiteSpace="pre-wrap">
            {specialNotes}
          </Text>
        ) : (
          <InvoiceMutedLine>No special notes on this invoice.</InvoiceMutedLine>
        )}
      </InvoiceDetailPanel>

      <EventInvoicePayableLinkSection
        payPageUrl={payPageUrl}
        canPayOnline={canPayOnline}
        invoiceStatus={invoiceStatus}
        invoiceStatusLabel={invoiceStatusLabel}
      />
    </SimpleGrid>
  )
}

import { SimpleGrid, Text } from "@chakra-ui/react"
import { formatUtcDate } from "@/utils/utcDates"
import { InvoiceDetailPanel, InvoiceMutedLine } from "./InvoiceDetailPanel"

interface CustomInvoiceDetailPanelsProps {
  categoryName: string | null
  dueDateUtc: string | null
  /** Server-decided: unpaid and past due. The panel emphasises it and never re-derives it from the date. */
  isOverdue: boolean
  specialNotes: string | null
  invoiceStatus: string
  invoiceStatusLabel: string
}

const SETTLED_STATUSES = ["Paid", "Cancelled"]

/** The custom-invoice read panels: category, due date with overdue emphasis, special notes and the payable-link placeholder. */
export function CustomInvoiceDetailPanels({
  categoryName,
  dueDateUtc,
  isOverdue,
  specialNotes,
  invoiceStatus,
  invoiceStatusLabel,
}: CustomInvoiceDetailPanelsProps) {
  const dueDate = formatUtcDate(dueDateUtc)
  const isSettled = SETTLED_STATUSES.includes(invoiceStatus)

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

      <InvoiceDetailPanel title="Payable link">
        <InvoiceMutedLine>
          {isSettled
            ? `This invoice is ${invoiceStatusLabel} — no payable link is needed.`
            : "A payment link will be available once online payment is enabled for this invoice."}
        </InvoiceMutedLine>
      </InvoiceDetailPanel>
    </SimpleGrid>
  )
}

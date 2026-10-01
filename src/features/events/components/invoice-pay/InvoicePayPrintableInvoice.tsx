import { Box, Flex, Stack } from "@chakra-ui/react"
import { PrintInvoiceButton } from "@/components/common"
import type { EventInvoicePaySummary } from "@/features/events/schemas/eventInvoicePay.schemas"
import { InvoicePaySummaryCard } from "./InvoicePaySummaryCard"

interface InvoicePayPrintableInvoiceProps {
  summary: EventInvoicePaySummary
}

/**
 * The paper copy the buyer keeps: the invoice summary inside the print region, with the Print control sitting
 * outside it so the button never paints on the sheet. Everything printed here is the public summary alone.
 */
export function InvoicePayPrintableInvoice({ summary }: InvoicePayPrintableInvoiceProps) {
  return (
    <Stack gap={4}>
      <Flex data-print-hide justify="flex-end">
        <PrintInvoiceButton />
      </Flex>
      <Box data-print-region>
        <InvoicePaySummaryCard {...summary} />
      </Box>
    </Stack>
  )
}

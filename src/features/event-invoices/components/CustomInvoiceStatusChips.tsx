import { Button, Flex } from "@chakra-ui/react"
import {
  CUSTOM_INVOICE_LIST_STATUSES,
  CUSTOM_INVOICE_LIST_STATUS_LABELS,
  type CustomInvoiceListStatus,
} from "@/api/customInvoices"

interface CustomInvoiceStatusChipsProps {
  selected: CustomInvoiceListStatus[]
  onToggle: (status: CustomInvoiceListStatus) => void
}

/** Multi-select toggles; none pressed means every status. */
export function CustomInvoiceStatusChips({ selected, onToggle }: CustomInvoiceStatusChipsProps) {
  return (
    <Flex role="group" aria-label="Status" wrap="wrap" gap={2}>
      {CUSTOM_INVOICE_LIST_STATUSES.map((status) => {
        const isSelected = selected.includes(status)
        return (
          <Button
            key={status}
            aria-pressed={isSelected}
            variant={isSelected ? "solid" : "outline"}
            colorPalette="brand"
            minH="11"
            px={5}
            borderRadius="999px"
            fontWeight="700"
            cursor="pointer"
            onClick={() => onToggle(status)}
          >
            {CUSTOM_INVOICE_LIST_STATUS_LABELS[status]}
          </Button>
        )
      })}
    </Flex>
  )
}

import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { useWatch, type Control } from "react-hook-form"
import { format, parseISO } from "date-fns"
import { formatCurrency, sumMoney } from "@/utils/format"
import { LINE_AMOUNT_PATTERN, type CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceDeliverySection } from "./CustomInvoiceDeliverySection"

interface CustomInvoiceSummaryPanelProps {
  control: Control<CustomInvoiceFormValues>
  currencySymbol?: string
  isNewInvoice: boolean
  /** Where the invoice stands: "Not saved yet" before the first save, otherwise its saved status. */
  statusLabel: string
  submitLabel: string
  isPending: boolean
  canSubmit: boolean
  cancelLabel: string
  onCancel: () => void
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={4}>
      <Text fontSize="sm" fontWeight="600" color="text.secondary">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="700" color="text.primary" textAlign="right">
        {value}
      </Text>
    </Flex>
  )
}

function formatDueDate(dueDate: string | undefined): string {
  return dueDate ? format(parseISO(dueDate), "MMM d, yyyy") : "Not set"
}

/**
 * The invoice at a glance while it is written: status, what the buyer will owe, when, and the save action.
 * Total due sums only amounts that are already valid money, so a half-typed figure never shows NaN; the
 * sum stays decimal text and never passes through a float.
 */
export function CustomInvoiceSummaryPanel({ control, currencySymbol = "$", isNewInvoice, statusLabel, submitLabel, isPending, canSubmit, cancelLabel, onCancel }: CustomInvoiceSummaryPanelProps) {
  const lineItems = useWatch({ control, name: "lineItems" }) ?? []
  const dueDate = useWatch({ control, name: "dueDate" })

  const amounts = lineItems
    .map((line) => (line?.amount ?? "").trim())
    .filter((amount) => LINE_AMOUNT_PATTERN.test(amount))

  return (
    <Box
      as="aside"
      aria-label="Invoice summary"
      position={{ base: "static", lg: "sticky" }}
      top={{ lg: 6 }}
      borderRadius="20px"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 6 }}
    >
      <Stack gap={4}>
        <Text fontSize="md" fontWeight="800" color="text.primary">
          Summary
        </Text>
        <SummaryRow label="Status" value={statusLabel} />
        <Stack gap={1}>
          <Text fontSize="sm" fontWeight="600" color="text.secondary">
            Total due
          </Text>
          <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="900" color="text.primary" aria-live="polite" overflowWrap="anywhere">
            {formatCurrency(sumMoney(amounts), currencySymbol)}
          </Text>
        </Stack>
        <SummaryRow label="Due date" value={formatDueDate(dueDate)} />
        {isNewInvoice ? <CustomInvoiceDeliverySection control={control} disabled={isPending} /> : null}
        {canSubmit ? (
          <Button
            type="submit"
            minH="11"
            borderRadius="14px"
            bg="brand.gradient"
            color="white"
            fontWeight="800"
            w="full"
            cursor={isPending ? "not-allowed" : "pointer"}
            disabled={isPending}
            loading={isPending}
            loadingText="Saving..."
          >
            {submitLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          minH="11"
          borderRadius="14px"
          borderColor="border.subtle"
          fontWeight="700"
          color="text.primary"
          w="full"
          cursor="pointer"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      </Stack>
    </Box>
  )
}

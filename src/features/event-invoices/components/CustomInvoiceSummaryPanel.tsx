import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { useWatch, type Control } from "react-hook-form"
import { format, parseISO } from "date-fns"
import type { CustomInvoiceDetail } from "@/api/customInvoices"
import { buildBuyerAppUrl } from "@/lib/appConfig"
import { formatCurrency, sumMoney } from "@/utils/format"
import { APP_ROUTES } from "@/utils/routes"
import { LINE_AMOUNT_PATTERN, type CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceDeliverySection } from "./CustomInvoiceDeliverySection"
import { CustomInvoicePayableLinkSection } from "./CustomInvoicePayableLinkSection"
import { EventInvoiceStatusBadge } from "./EventInvoiceStatusBadge"

interface CustomInvoiceSummaryPanelProps {
  control: Control<CustomInvoiceFormValues>
  /** The saved invoice as the server reports it; absent before the first save. */
  detail?: CustomInvoiceDetail
  submitLabel: string
  isPending: boolean
  canSubmit: boolean
  cancelLabel: string
  onCancel: () => void
}

const NEW_INVOICE_CURRENCY_SYMBOL = "$"

function RowLabel({ children }: { children: string }) {
  return (
    <Text fontSize="sm" fontWeight="600" color="text.secondary">
      {children}
    </Text>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={4}>
      <RowLabel>{label}</RowLabel>
      <Text fontSize="sm" fontWeight="700" color="text.primary" textAlign="right">
        {value}
      </Text>
    </Flex>
  )
}

function StatusRow({ detail }: { detail?: CustomInvoiceDetail }) {
  if (!detail) return <SummaryRow label="Status" value="Not saved yet" />
  return (
    <Flex justify="space-between" align="center" gap={4} wrap="wrap">
      <RowLabel>Status</RowLabel>
      <Flex align="center" gap={2}>
        <EventInvoiceStatusBadge status={detail.invoiceStatus} label={detail.invoiceStatusLabel} size="sm" />
        {detail.isOverdue ? (
          <Text fontSize="sm" fontWeight="800" color="status.warning.fg">
            Overdue
          </Text>
        ) : null}
      </Flex>
    </Flex>
  )
}

function PayableLinkRow({ detail }: { detail?: CustomInvoiceDetail }) {
  if (!detail) {
    return (
      <Stack gap={1}>
        <RowLabel>Payable link</RowLabel>
        <Text fontSize="sm" color="text.secondary">
          Link appears after you save
        </Text>
      </Stack>
    )
  }
  return (
    <CustomInvoicePayableLinkSection
      payPageUrl={buildBuyerAppUrl(APP_ROUTES.customInvoicePay(detail.invoiceUniqueId))}
      canPayOnline={detail.canPayOnline}
      invoiceStatus={detail.invoiceStatus}
      invoiceStatusLabel={detail.invoiceStatusLabel}
    />
  )
}

function formatDueDate(dueDate: string | undefined): string {
  return dueDate ? format(parseISO(dueDate), "MMM d, yyyy") : "Not set"
}

/**
 * The invoice at a glance while it is written: status, what the buyer will owe, when, how they can pay, how
 * it reaches them, and the save action. Total due sums only amounts that are already valid money, so a
 * half-typed figure never shows NaN; the sum stays decimal text and never passes through a float.
 */
export function CustomInvoiceSummaryPanel({ control, detail, submitLabel, isPending, canSubmit, cancelLabel, onCancel }: CustomInvoiceSummaryPanelProps) {
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
        <StatusRow detail={detail} />
        <Stack gap={1}>
          <RowLabel>Total due</RowLabel>
          <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="900" color="text.primary" aria-live="polite" overflowWrap="anywhere">
            {formatCurrency(sumMoney(amounts), detail?.currencySymbol ?? NEW_INVOICE_CURRENCY_SYMBOL)}
          </Text>
        </Stack>
        <SummaryRow label="Due date" value={formatDueDate(dueDate)} />
        <PayableLinkRow detail={detail} />
        <CustomInvoiceDeliverySection control={control} detail={detail} disabled={isPending} />
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

import { useState } from "react"
import { Button, Flex, Stack, Text } from "@chakra-ui/react"
import type { Control } from "react-hook-form"
import { Mail, Printer } from "lucide-react"
import type { CustomInvoiceDetail } from "@/api/customInvoices"
import { ConfirmDialog } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { formatUtcDate } from "@/utils/utcDates"
import { useEmailCustomInvoice } from "../hooks/useCustomInvoices"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { CustomInvoiceEmailOnCreateCheckbox } from "./CustomInvoiceEmailOnCreateCheckbox"

interface CustomInvoiceDeliverySectionProps {
  control: Control<CustomInvoiceFormValues>
  /** The saved invoice; absent before the first save, when delivery is only the choice to email on create. */
  detail?: CustomInvoiceDetail
  disabled?: boolean
}

// A settled or cancelled invoice has nothing left to pay, so its payable link is not worth emailing.
const CLOSED_STATUSES = ["Paid", "Cancelled"]

const ACTION_BUTTON_STYLE = {
  variant: "outline",
  borderRadius: "14px",
  minH: "11",
  px: 4,
  fontWeight: "700",
  w: { base: "full", md: "auto" },
  cursor: "pointer",
} as const

function SentState({ lastSentAtUtc }: { lastSentAtUtc: string | null }) {
  const sentOn = formatUtcDate(lastSentAtUtc)
  if (sentOn) {
    return (
      <Text fontSize="sm" fontWeight="700" color="status.success.fg">
        {`Sent on ${sentOn}`}
      </Text>
    )
  }
  return (
    <Stack gap={0.5}>
      <Text fontSize="sm" fontWeight="700" color="text.primary">
        Not sent
      </Text>
      <Text fontSize="sm" color="text.secondary">
        The buyer has not been emailed this invoice yet.
      </Text>
    </Stack>
  )
}

function EmailLinkAction({ detail }: { detail: CustomInvoiceDetail }) {
  const emailMutation = useEmailCustomInvoice(detail.invoiceUniqueId)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const recipient = detail.buyerEmail.trim() || "the buyer on file"

  const openConfirm = () => {
    emailMutation.reset()
    setIsConfirmOpen(true)
  }

  const send = async () => {
    try {
      await emailMutation.mutateAsync()
      setIsConfirmOpen(false)
    } catch {
      // Kept open so the dialog's error banner stays beside the action that failed.
    }
  }

  return (
    <>
      <Button type="button" {...ACTION_BUTTON_STYLE} onClick={openConfirm}>
        <Mail size={16} />
        Email link
      </Button>
      <ConfirmDialog
        open={isConfirmOpen}
        title="Email the payable link?"
        description={
          <Text>
            Invoice <strong>{detail.invoiceNo}</strong> and its online payable link will be emailed to <strong>{recipient}</strong>.
          </Text>
        }
        confirmLabel="Send email"
        loadingLabel="Sending..."
        tone="primary"
        errorMessage={emailMutation.error ? extractApiError(emailMutation.error) : null}
        isPending={emailMutation.isPending}
        onConfirm={send}
        onClose={() => setIsConfirmOpen(false)}
      />
    </>
  )
}

// The editor is not a printable invoice, so Print opens the detail page's print layout in a new tab, which
// leaves any unsaved edits here untouched.
function PrintAction({ invoiceUniqueId }: { invoiceUniqueId: string }) {
  return (
    <Button asChild {...ACTION_BUTTON_STYLE}>
      <a href={`${APP_ROUTES.customInvoices.detail(invoiceUniqueId)}?print=1`} target="_blank" rel="noopener noreferrer">
        <Printer size={16} />
        Print
      </a>
    </Button>
  )
}

function SavedInvoiceDelivery({ detail }: { detail: CustomInvoiceDetail }) {
  const canEmailLink = detail.canSend && !CLOSED_STATUSES.includes(detail.invoiceStatus)
  return (
    <>
      <SentState lastSentAtUtc={detail.lastSentAtUtc} />
      <Flex direction={{ base: "column", md: "row" }} wrap="wrap" gap={2}>
        <PrintAction invoiceUniqueId={detail.invoiceUniqueId} />
        {canEmailLink ? <EmailLinkAction detail={detail} /> : null}
      </Flex>
    </>
  )
}

/**
 * How the invoice reaches its buyer. Before the first save that is the choice to email the payable link on
 * create; afterwards it is whether the buyer has been emailed and the action to email them now.
 */
export function CustomInvoiceDeliverySection({ control, detail, disabled }: CustomInvoiceDeliverySectionProps) {
  return (
    <Stack as="section" aria-label="Delivery" gap={2}>
      <Text fontSize="sm" fontWeight="600" color="text.secondary">
        Delivery
      </Text>
      {detail ? <SavedInvoiceDelivery detail={detail} /> : <CustomInvoiceEmailOnCreateCheckbox control={control} disabled={disabled} />}
    </Stack>
  )
}

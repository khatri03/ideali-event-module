import { useState } from "react"
import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { Copy, ExternalLink } from "lucide-react"
import { toaster } from "@/lib/toaster"
import { InvoiceDetailPanel, InvoiceMutedLine } from "./InvoiceDetailPanel"

interface CustomInvoicePayableLinkSectionProps {
  /** Absolute buyer pay page URL, built from validated build-time config. */
  payPageUrl: string
  /** Server-decided; the section never re-derives payability from the status. */
  canPayOnline: boolean
  invoiceStatus: string
  invoiceStatusLabel: string
}

interface PayableLinkActionsProps {
  payPageUrl: string
  isEnabled: boolean
  onCopy: () => void
}

const CLOSED_STATUSES = ["Paid", "Cancelled"]
const COPY_FAILED_MESSAGE = "Couldn't copy the link. Select it above and copy it manually."

const ACTION_BUTTON_STYLE = {
  borderRadius: "14px",
  minH: "11",
  px: 4,
  w: { base: "full", md: "auto" },
} as const

function notPayableReason(invoiceStatus: string, invoiceStatusLabel: string): string {
  return CLOSED_STATUSES.includes(invoiceStatus)
    ? `This invoice is ${invoiceStatusLabel}, so it can't be paid online.`
    : "This invoice can't be paid online in its current state."
}

function PayableLinkActions({ payPageUrl, isEnabled, onCopy }: PayableLinkActionsProps) {
  const cursor = isEnabled ? "pointer" : "not-allowed"

  return (
    <Flex data-print-hide direction={{ base: "column", md: "row" }} wrap="wrap" gap={2} mt={2}>
      {isEnabled ? (
        <Button asChild variant="outline" cursor={cursor} {...ACTION_BUTTON_STYLE}>
          <a href={payPageUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} />
            Open payment page
          </a>
        </Button>
      ) : (
        <Button variant="outline" disabled cursor={cursor} {...ACTION_BUTTON_STYLE}>
          <ExternalLink size={16} />
          Open payment page
        </Button>
      )}
      <Button
        colorPalette="brand"
        color="white"
        bg="brand.gradient"
        disabled={!isEnabled}
        cursor={cursor}
        onClick={onCopy}
        {...ACTION_BUTTON_STYLE}
      >
        <Copy size={16} />
        Copy link
      </Button>
    </Flex>
  )
}

/**
 * The link the organizer hands a buyer so they can pay by card. It only ever shows a URL: the payment itself
 * is started by the buyer's page, so no client secret reaches the organizer UI. It makes no request of its own,
 * so while the invoice loads the detail page's skeleton stands in for it.
 */
export function CustomInvoicePayableLinkSection({
  payPageUrl,
  canPayOnline,
  invoiceStatus,
  invoiceStatusLabel,
}: CustomInvoicePayableLinkSectionProps) {
  const [hasCopyFailed, setHasCopyFailed] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payPageUrl)
      setHasCopyFailed(false)
      toaster.create({ type: "success", title: "Payment link copied." })
    } catch {
      setHasCopyFailed(true)
    }
  }

  return (
    <InvoiceDetailPanel title="Payable link">
      {canPayOnline ? (
        <>
          <InvoiceMutedLine>Share this link with the buyer. They can pay by card without signing in.</InvoiceMutedLine>
          <Box mt={2} px={3} py={2} border="1px solid" borderColor="border.subtle" borderRadius="12px" bg="card.bg">
            <Text fontSize="sm" color="text.primary" wordBreak="break-all" userSelect="all">
              {payPageUrl}
            </Text>
          </Box>
        </>
      ) : (
        <InvoiceMutedLine>{notPayableReason(invoiceStatus, invoiceStatusLabel)}</InvoiceMutedLine>
      )}

      {hasCopyFailed ? (
        <Box role="alert" mt={2} p={3} borderRadius="12px" bg="status.error.bg">
          <Text fontSize="sm" fontWeight="700" color="status.error.fg">
            {COPY_FAILED_MESSAGE}
          </Text>
        </Box>
      ) : null}

      <PayableLinkActions payPageUrl={payPageUrl} isEnabled={canPayOnline} onCopy={handleCopy} />
    </InvoiceDetailPanel>
  )
}

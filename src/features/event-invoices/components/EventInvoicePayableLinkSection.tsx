import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { Copy, ExternalLink } from "lucide-react"
import { toaster } from "@/lib/toaster"
import { InvoiceDetailPanel, InvoiceMutedLine } from "./InvoiceDetailPanel"

interface EventInvoicePayableLinkSectionProps {
  /** Absolute buyer pay page URL, built from validated build-time config. */
  payPageUrl: string
  /** Server-decided; the section never re-derives payability from the status. */
  canPayOnline: boolean
  invoiceStatus: string
  invoiceStatusLabel: string
}

/**
 * The link the organizer hands a buyer so they can pay by card. It only ever shows a URL: the payment itself
 * is started by the buyer's page, so no client secret reaches the organizer UI.
 */
export function EventInvoicePayableLinkSection({ payPageUrl, canPayOnline, invoiceStatusLabel }: EventInvoicePayableLinkSectionProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payPageUrl)
      toaster.create({ type: "success", title: "Payment link copied." })
    } catch {
      toaster.create({ type: "error", title: "Couldn't copy the link." })
    }
  }

  if (!canPayOnline) {
    return (
      <InvoiceDetailPanel title="Payable link">
        <InvoiceMutedLine>{`This invoice is ${invoiceStatusLabel}, so it can't be paid online.`}</InvoiceMutedLine>
      </InvoiceDetailPanel>
    )
  }

  return (
    <InvoiceDetailPanel title="Payable link">
      <InvoiceMutedLine>Share this link with the buyer. They can pay by card without signing in.</InvoiceMutedLine>
      <Box mt={2} px={3} py={2} border="1px solid" borderColor="border.subtle" borderRadius="12px" bg="card.bg">
        <Text fontSize="sm" color="text.primary" wordBreak="break-all" userSelect="all">
          {payPageUrl}
        </Text>
      </Box>
      <Flex data-print-hide direction={{ base: "column", md: "row" }} wrap="wrap" gap={2} mt={2}>
        <Button asChild variant="outline" borderRadius="14px" minH="11" px={4} w={{ base: "full", md: "auto" }} cursor="pointer">
          <a href={payPageUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} />
            Open payment page
          </a>
        </Button>
        <Button
          colorPalette="brand"
          color="white"
          bg="brand.gradient"
          borderRadius="14px"
          minH="11"
          px={4}
          w={{ base: "full", md: "auto" }}
          cursor="pointer"
          onClick={handleCopy}
        >
          <Copy size={16} />
          Copy link
        </Button>
      </Flex>
    </InvoiceDetailPanel>
  )
}

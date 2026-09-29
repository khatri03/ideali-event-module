import { useState } from "react"
import { Button, Flex, Link, Text } from "@chakra-ui/react"
import { Unlink } from "lucide-react"
import { Link as RouterLink } from "react-router-dom"
import type { EventInvoiceLinkedReference } from "@/api/eventInvoices"
import { ConfirmDialog } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { useUnlinkEventInvoice } from "../hooks/useEventInvoices"
import { InvoiceDetailPanel, InvoiceMutedLine } from "./InvoiceDetailPanel"

interface LinkedInvoicePanelProps {
  invoiceUniqueId: string
  invoiceNo: string
  linkedInvoice: EventInvoiceLinkedReference | null
}

interface LinkedInvoiceReferenceProps {
  invoiceUniqueId: string
  invoiceNo: string
  linkedInvoice: EventInvoiceLinkedReference
}

function LinkedInvoiceReference({ invoiceUniqueId, invoiceNo, linkedInvoice }: LinkedInvoiceReferenceProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const unlinkMutation = useUnlinkEventInvoice(invoiceUniqueId, linkedInvoice.invoiceUniqueId)

  const handleConfirm = async () => {
    try {
      await unlinkMutation.mutateAsync()
      setIsConfirmOpen(false)
    } catch {
      // Kept open so the dialog's error banner stays beside the link that is still in place.
    }
  }

  const openConfirm = () => {
    unlinkMutation.reset()
    setIsConfirmOpen(true)
  }

  return (
    <Flex align={{ base: "stretch", sm: "center" }} justify="space-between" gap={3} direction={{ base: "column", sm: "row" }}>
      <Flex align="center" gap={2} wrap="wrap">
        <Link
          asChild
          fontSize="md"
          fontWeight="800"
          color="brand.600"
          cursor="pointer"
          display="inline-flex"
          minH="11"
          alignItems="center"
          _hover={{ textDecoration: "underline" }}
        >
          <RouterLink to={APP_ROUTES.eventInvoices.detail(linkedInvoice.invoiceUniqueId)}>{linkedInvoice.invoiceNo}</RouterLink>
        </Link>
        {linkedInvoice.invoiceStatusLabel ? (
          <Text fontSize="sm" color="text.secondary">
            {linkedInvoice.invoiceStatusLabel}
          </Text>
        ) : null}
      </Flex>

      <Button
        data-print-hide
        variant="outline"
        colorPalette="red"
        borderRadius="14px"
        minH="11"
        px={4}
        w={{ base: "full", sm: "auto" }}
        cursor="pointer"
        onClick={openConfirm}
      >
        <Unlink size={16} />
        Remove link
      </Button>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Remove link?"
        description={
          <Text>
            Unlink invoice <strong>{invoiceNo}</strong> from <strong>{linkedInvoice.invoiceNo}</strong>? Both invoices stay
            separate — only the reference between them is removed.
          </Text>
        }
        confirmLabel="Remove link"
        loadingLabel="Removing..."
        tone="destructive"
        errorMessage={unlinkMutation.error ? extractApiError(unlinkMutation.error) : null}
        isPending={unlinkMutation.isPending}
        onConfirm={handleConfirm}
        onClose={() => setIsConfirmOpen(false)}
      />
    </Flex>
  )
}

/** The reciprocal link reference on an invoice's detail, with the one mutation it admits: removing it. */
export function LinkedInvoicePanel({ invoiceUniqueId, invoiceNo, linkedInvoice }: LinkedInvoicePanelProps) {
  return (
    <InvoiceDetailPanel title="Linked invoice">
      {linkedInvoice ? (
        <LinkedInvoiceReference invoiceUniqueId={invoiceUniqueId} invoiceNo={invoiceNo} linkedInvoice={linkedInvoice} />
      ) : (
        <InvoiceMutedLine>Not linked to another invoice.</InvoiceMutedLine>
      )}
    </InvoiceDetailPanel>
  )
}

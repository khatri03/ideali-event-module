import { useState } from "react"
import { Button, Text, VisuallyHidden } from "@chakra-ui/react"
import { Pencil } from "lucide-react"
import { EMPTY_VALUE } from "@/utils/format"
import { EventInvoiceBuyerDialog } from "./EventInvoiceBuyerDialog"
import { InvoiceDetailPanel, InvoiceMutedLine } from "./InvoiceDetailPanel"

interface EventInvoiceBuyerPanelProps {
  invoiceUniqueId: string
  invoiceNo: string
  buyerName: string
  buyerEmail: string | null
  buyerPhone: string | null
  /** Server-decided: a closed order's buyer is part of the settled record and is never rewritten. */
  canEditBuyer: boolean
  hasIssuedTickets: boolean
  canResendTickets: boolean
}

export function EventInvoiceBuyerPanel({
  invoiceUniqueId,
  invoiceNo,
  buyerName,
  buyerEmail,
  buyerPhone,
  canEditBuyer,
  hasIssuedTickets,
  canResendTickets,
}: EventInvoiceBuyerPanelProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <InvoiceDetailPanel
        title="Billed to"
        action={
          canEditBuyer ? (
            <Button
              data-print-hide
              size="sm"
              variant="ghost"
              colorPalette="brand"
              borderRadius="10px"
              minH="11"
              px={2}
              cursor="pointer"
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={14} />
              Edit
              <VisuallyHidden> buyer details for invoice {invoiceNo}</VisuallyHidden>
            </Button>
          ) : null
        }
      >
        <Text fontSize="md" fontWeight="800" color="text.primary">
          {buyerName || EMPTY_VALUE}
        </Text>
        <InvoiceMutedLine>{buyerEmail || EMPTY_VALUE}</InvoiceMutedLine>
        <InvoiceMutedLine>{buyerPhone || EMPTY_VALUE}</InvoiceMutedLine>
      </InvoiceDetailPanel>

      {isEditing ? (
        <EventInvoiceBuyerDialog
          invoiceUniqueId={invoiceUniqueId}
          buyerName={buyerName}
          buyerEmail={buyerEmail}
          buyerPhone={buyerPhone}
          hasIssuedTickets={hasIssuedTickets}
          canResendTickets={canResendTickets}
          onClose={() => setIsEditing(false)}
        />
      ) : null}
    </>
  )
}

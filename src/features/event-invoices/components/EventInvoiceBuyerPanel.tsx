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
  // 0 means editing has never started, so the dialog (and its mutation hooks) isn't mounted at all yet.
  // Bumped on every open so EventInvoiceBuyerDialog's form remounts with a clean slate each time.
  const [editSessionKey, setEditSessionKey] = useState(0)

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
              onClick={() => {
                setEditSessionKey((session) => session + 1)
                setIsEditing(true)
              }}
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

      {/*
        Mounted once editing starts and kept mounted after - toggling `open` instead of unmounting lets
        Ark's dialog machine run its own close transition (releasing the scroll lock and focus trap it
        set up) before anything is torn down.
      */}
      {canEditBuyer && editSessionKey > 0 ? (
        <EventInvoiceBuyerDialog
          open={isEditing}
          editSessionKey={editSessionKey}
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

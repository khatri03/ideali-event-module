import { useState } from "react"
import { Button, Stack, Text } from "@chakra-ui/react"
import { Ban, CheckCircle2, Send } from "lucide-react"
import { ConfirmDialog } from "@/features/custom-lists"
import { extractApiError } from "@/utils/errors"
import { useCancelEventInvoice, useMarkEventInvoiceAsPaid, useResendEventInvoice } from "../hooks/useEventInvoices"

type SettlementAction = "mark-paid" | "cancel" | "resend"

interface EventInvoiceSettlementActionsProps {
  invoiceUniqueId: string
  invoiceNo: string
  /** Server-decided, never inferred from the signed-in role - the endpoints enforce the same rule. */
  canMarkAsPaid: boolean
  canCancel: boolean
  canResendTickets: boolean
}

/**
 * A bare row of buttons, no card of its own: it sits above the buyer/order panels so the decision is
 * made before the organizer reads what it would apply to, rather than partway down the page.
 */
export function EventInvoiceSettlementActions({
  invoiceUniqueId,
  invoiceNo,
  canMarkAsPaid,
  canCancel,
  canResendTickets,
}: EventInvoiceSettlementActionsProps) {
  // `action` names which confirmation to show and is sticky across a close - only `isConfirmOpen` drives
  // visibility, so the dialog stays mounted after its first use and Ark's own close transition (which
  // releases the scroll lock and focus trap) runs before anything is torn down.
  const [action, setAction] = useState<SettlementAction | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const markPaidMutation = useMarkEventInvoiceAsPaid(invoiceUniqueId)
  const cancelMutation = useCancelEventInvoice(invoiceUniqueId)
  const resendMutation = useResendEventInvoice(invoiceUniqueId)

  if (!canMarkAsPaid && !canCancel && !canResendTickets) {
    return null
  }

  const openAction = (next: SettlementAction) => {
    setAction(next)
    setIsConfirmOpen(true)
  }
  const closeConfirm = () => setIsConfirmOpen(false)

  const activeMutation = action === "cancel" ? cancelMutation : action === "resend" ? resendMutation : markPaidMutation

  const handleConfirm = async () => {
    try {
      await activeMutation.mutateAsync()
      closeConfirm()
    } catch {
      // Kept open so the dialog's own error banner stays on screen with the failed action in view.
    }
  }

  return (
    <Stack direction={{ base: "column", sm: "row" }} gap={3} align={{ base: "stretch", sm: "center" }} wrap="wrap">
      {canMarkAsPaid ? (
        <Button
          colorPalette="green"
          borderRadius="14px"
          minH="11"
          px={5}
          w={{ base: "full", sm: "auto" }}
          cursor="pointer"
          onClick={() => openAction("mark-paid")}
        >
          <CheckCircle2 size={16} />
          Mark as paid
        </Button>
      ) : null}

      {canCancel ? (
        <Button
          variant="outline"
          colorPalette="red"
          borderRadius="14px"
          minH="11"
          px={5}
          w={{ base: "full", sm: "auto" }}
          cursor="pointer"
          onClick={() => openAction("cancel")}
        >
          <Ban size={16} />
          Mark as cancelled
        </Button>
      ) : null}

      {canResendTickets ? (
        <Button
          variant="outline"
          colorPalette="brand"
          borderRadius="14px"
          minH="11"
          px={5}
          w={{ base: "full", sm: "auto" }}
          cursor="pointer"
          onClick={() => openAction("resend")}
        >
          <Send size={16} />
          Resend all tickets
        </Button>
      ) : null}

      {action ? (
        <ConfirmDialog
          open={isConfirmOpen}
          title={
            action === "cancel"
              ? "Cancel this order"
              : action === "resend"
                ? "Resend all tickets"
                : "Mark this order as paid"
          }
          description={
            action === "cancel" ? (
              <Text>
                Order <strong>{invoiceNo}</strong> will be closed unpaid, the seats it holds released, and
                the buyer emailed. Its tickets can no longer be sent out. This cannot be undone.
              </Text>
            ) : action === "resend" ? (
              <Text>Re-email every ticket on this order to the buyer and any attendees with their own address?</Text>
            ) : (
              <Text>
                Order <strong>{invoiceNo}</strong> will be recorded as paid in full, the buyer emailed, and
                any tickets it is owed issued and delivered. This cannot be undone.
              </Text>
            )
          }
          confirmLabel={action === "cancel" ? "Cancel order" : action === "resend" ? "Resend all" : "Mark as paid"}
          loadingLabel={action === "cancel" ? "Cancelling..." : action === "resend" ? "Sending..." : "Settling..."}
          tone={action === "cancel" ? "destructive" : "primary"}
          errorMessage={activeMutation.error ? extractApiError(activeMutation.error) : null}
          isPending={activeMutation.isPending}
          onConfirm={handleConfirm}
          onClose={closeConfirm}
        />
      ) : null}
    </Stack>
  )
}

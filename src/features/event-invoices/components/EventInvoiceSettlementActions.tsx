import { useState } from "react"
import { Button, Stack, Text } from "@chakra-ui/react"
import { Ban, CheckCircle2, Send } from "lucide-react"
import { ConfirmDialog } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { useCancelEventInvoice, useMarkEventInvoiceAsPaid, useResendEventInvoice } from "../hooks/useEventInvoices"
import { CancelInvoiceDialog } from "./CancelInvoiceDialog"

type ConfirmAction = "mark-paid" | "resend"

interface EventInvoiceSettlementActionsProps {
  invoiceUniqueId: string
  invoiceNo: string
  /** Server-decided, never inferred from the signed-in role - the endpoints enforce the same rule. */
  canMarkAsPaid: boolean
  canCancel: boolean
  canResendTickets: boolean
}

const ACTION_BUTTON_PROPS = {
  borderRadius: "14px",
  minH: "11",
  px: 5,
  w: { base: "full", sm: "auto" },
  cursor: "pointer",
} as const

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
  // `confirmAction` names which confirmation to show and is sticky across a close - only the open flags
  // drive visibility, so each dialog stays mounted after its first use and Ark's own close transition
  // (which releases the scroll lock and focus trap) runs before anything is torn down.
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const markPaidMutation = useMarkEventInvoiceAsPaid(invoiceUniqueId)
  const cancelMutation = useCancelEventInvoice(invoiceUniqueId)
  const resendMutation = useResendEventInvoice(invoiceUniqueId)

  if (!canMarkAsPaid && !canCancel && !canResendTickets) {
    return null
  }

  const openConfirm = (next: ConfirmAction) => {
    setConfirmAction(next)
    setIsConfirmOpen(true)
  }

  // The form clears on every open, so the failure banner from an earlier attempt clears with it.
  const openCancel = () => {
    cancelMutation.reset()
    setIsCancelOpen(true)
  }

  const confirmMutation = confirmAction === "resend" ? resendMutation : markPaidMutation

  const runThenClose = async (run: () => Promise<void>, close: () => void) => {
    try {
      await run()
      close()
    } catch {
      // Kept open so the dialog's own error banner stays on screen with the failed action in view.
    }
  }

  return (
    <Stack direction={{ base: "column", sm: "row" }} gap={3} align={{ base: "stretch", sm: "center" }} wrap="wrap">
      {canMarkAsPaid ? (
        <Button colorPalette="green" {...ACTION_BUTTON_PROPS} onClick={() => openConfirm("mark-paid")}>
          <CheckCircle2 size={16} />
          Mark as paid
        </Button>
      ) : null}

      {canCancel ? (
        <Button variant="outline" colorPalette="red" {...ACTION_BUTTON_PROPS} onClick={openCancel}>
          <Ban size={16} />
          Mark as cancelled
        </Button>
      ) : null}

      {canResendTickets ? (
        <Button variant="outline" colorPalette="brand" {...ACTION_BUTTON_PROPS} onClick={() => openConfirm("resend")}>
          <Send size={16} />
          Resend all tickets
        </Button>
      ) : null}

      {confirmAction ? (
        <ConfirmDialog
          open={isConfirmOpen}
          title={confirmAction === "resend" ? "Resend all tickets" : "Mark this order as paid"}
          description={
            confirmAction === "resend" ? (
              <Text>Re-email every ticket on this order to the buyer and any attendees with their own address?</Text>
            ) : (
              <Text>
                Order <strong>{invoiceNo}</strong> will be recorded as paid in full, the buyer emailed, and
                any tickets it is owed issued and delivered. This cannot be undone.
              </Text>
            )
          }
          confirmLabel={confirmAction === "resend" ? "Resend all" : "Mark as paid"}
          loadingLabel={confirmAction === "resend" ? "Sending..." : "Settling..."}
          tone="primary"
          errorMessage={confirmMutation.error ? extractApiError(confirmMutation.error) : null}
          isPending={confirmMutation.isPending}
          onConfirm={() => runThenClose(() => confirmMutation.mutateAsync(), () => setIsConfirmOpen(false))}
          onClose={() => setIsConfirmOpen(false)}
        />
      ) : null}

      {canCancel ? (
        <CancelInvoiceDialog
          open={isCancelOpen}
          invoiceNo={invoiceNo}
          isPending={cancelMutation.isPending}
          errorMessage={cancelMutation.error ? extractApiError(cancelMutation.error) : null}
          onConfirm={(cancellationNotes) =>
            runThenClose(() => cancelMutation.mutateAsync(cancellationNotes), () => setIsCancelOpen(false))
          }
          onClose={() => setIsCancelOpen(false)}
        />
      ) : null}
    </Stack>
  )
}

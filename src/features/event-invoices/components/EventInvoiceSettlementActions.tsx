import { useState } from "react"
import { Button, Stack, Text } from "@chakra-ui/react"
import { Ban, CheckCircle2 } from "lucide-react"
import { ConfirmDialog } from "@/features/custom-lists"
import { extractApiError } from "@/utils/errors"
import { useCancelEventInvoice, useMarkEventInvoiceAsPaid } from "../hooks/useEventInvoices"

type SettlementAction = "mark-paid" | "cancel"

interface EventInvoiceSettlementActionsProps {
  invoiceUniqueId: string
  invoiceNo: string
  /** Server-decided, never inferred from the signed-in role - the endpoints enforce the same rule. */
  canMarkAsPaid: boolean
  canCancel: boolean
}

/**
 * A bare row of buttons, no card of its own: it is mounted inside the invoice header so the decision
 * sits with the order's identity and status rather than partway down the page.
 */
export function EventInvoiceSettlementActions({
  invoiceUniqueId,
  invoiceNo,
  canMarkAsPaid,
  canCancel,
}: EventInvoiceSettlementActionsProps) {
  const [pendingAction, setPendingAction] = useState<SettlementAction | null>(null)
  const markPaidMutation = useMarkEventInvoiceAsPaid(invoiceUniqueId)
  const cancelMutation = useCancelEventInvoice(invoiceUniqueId)

  if (!canMarkAsPaid && !canCancel) {
    return null
  }

  const activeMutation = pendingAction === "cancel" ? cancelMutation : markPaidMutation

  const handleConfirm = async () => {
    try {
      await activeMutation.mutateAsync()
      setPendingAction(null)
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
          onClick={() => setPendingAction("mark-paid")}
        >
          <CheckCircle2 size={16} />
          Mark as paid
        </Button>
      ) : null}

      {canCancel ? (
        <Button
          variant="outline"
          color="white"
          borderColor="whiteAlpha.500"
          borderRadius="14px"
          minH="11"
          px={5}
          w={{ base: "full", sm: "auto" }}
          cursor="pointer"
          _hover={{ bg: "status.error.bg", color: "status.error.fg", borderColor: "transparent" }}
          onClick={() => setPendingAction("cancel")}
        >
          <Ban size={16} />
          Mark as cancelled
        </Button>
      ) : null}

      {pendingAction ? (
        <ConfirmDialog
          title={pendingAction === "cancel" ? "Cancel this order" : "Mark this order as paid"}
          description={
            pendingAction === "cancel" ? (
              <Text>
                Order <strong>{invoiceNo}</strong> will be closed unpaid, the seats it holds released, and
                the buyer emailed. Its tickets can no longer be sent out. This cannot be undone.
              </Text>
            ) : (
              <Text>
                Order <strong>{invoiceNo}</strong> will be recorded as paid in full, the buyer emailed, and
                any tickets it is owed issued and delivered. This cannot be undone.
              </Text>
            )
          }
          confirmLabel={pendingAction === "cancel" ? "Cancel order" : "Mark as paid"}
          loadingLabel={pendingAction === "cancel" ? "Cancelling..." : "Settling..."}
          tone={pendingAction === "cancel" ? "destructive" : "primary"}
          errorMessage={activeMutation.error ? extractApiError(activeMutation.error) : null}
          isPending={activeMutation.isPending}
          onConfirm={handleConfirm}
          onClose={() => setPendingAction(null)}
        />
      ) : null}
    </Stack>
  )
}

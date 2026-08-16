import { ConfirmDialog } from "@/components/common"
import { describeCheckInConfirmation, type CheckInConfirmationKind } from "@/features/events/utils/checkInConfirmation"

interface CheckInConfirmDialogProps {
  kind: CheckInConfirmationKind
  ticketCode: string
  /** Kept mounted and toggled, so the dialog can release the body scroll lock on its way out. */
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function CheckInConfirmDialog({ kind, ticketCode, isOpen, onConfirm, onCancel }: CheckInConfirmDialogProps) {
  const copy = describeCheckInConfirmation(kind, ticketCode)

  return (
    <ConfirmDialog
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirmLabel}
      loadingLabel={copy.loadingLabel}
      tone={copy.tone}
      open={isOpen}
      // The dialog fires the action and gets out of the way: progress belongs on the control that was
      // pressed, so the operator can keep working the queue instead of watching a spinner in a modal.
      isPending={false}
      onConfirm={onConfirm}
      onClose={onCancel}
    />
  )
}

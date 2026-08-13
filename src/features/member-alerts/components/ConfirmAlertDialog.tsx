import { ConfirmDialog } from "@/components/common"

interface ConfirmAlertDialogProps {
  title: string
  message: string
  confirmLabel: string
  tone: "danger" | "brand"
  isLoading: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Thin adapter onto the shared ConfirmDialog, which already handles the Chakra v3 sizing quirks. */
export function ConfirmAlertDialog({
  title,
  message,
  confirmLabel,
  tone,
  isLoading,
  onConfirm,
  onClose,
}: ConfirmAlertDialogProps) {
  return (
    <ConfirmDialog
      title={title}
      description={message}
      confirmLabel={confirmLabel}
      isPending={isLoading}
      tone={tone === "danger" ? "destructive" : "primary"}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

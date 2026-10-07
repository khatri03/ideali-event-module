import { useState } from "react"
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { Ban, CheckCircle2, Mail, Send } from "lucide-react"
import { ConfirmDialog } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { SUBJECT_COPY, type InvoiceSubject } from "../invoiceSubjectCopy"
import type { InvoiceActionMutation } from "../types"
import { CancelInvoiceDialog } from "./CancelInvoiceDialog"
import { InvoiceSettlementActionsMenu } from "./InvoiceSettlementActionsMenu"

type ConfirmAction = "mark-paid" | "resend" | "email-invoice"

interface InvoiceSettlementActionsProps {
  invoiceNo: string
  /** Server-decided, never inferred from the signed-in role - the endpoints enforce the same rule. */
  canMarkAsPaid: boolean
  canCancel: boolean
  canResendTickets?: boolean
  /** A custom invoice the server allows sending can be emailed to its buyer with its payable link. */
  canEmailInvoice?: boolean
  /** The recipient named in the email confirm dialog, so a wrong address is caught before anything sends. */
  buyerEmail?: string | null
  markPaid: InvoiceActionMutation
  cancel: InvoiceActionMutation<string>
  /** Offered only by a ticket order; a custom invoice has no tickets to resend. */
  resendTickets?: InvoiceActionMutation
  /** Offered only by a custom invoice. */
  emailInvoice?: InvoiceActionMutation
  /** Names the thing being settled in the dialogs; a custom invoice has no seats or tickets to promise. */
  subject?: InvoiceSubject
  /** "menu" is the compact list-row form; both forms open the same dialogs. */
  variant?: "buttons" | "menu"
  /** Menu form only: opens the invoice from its row. */
  onView?: () => void
}

function confirmCopyFor(subject: InvoiceSubject): Record<ConfirmAction, { title: string; confirmLabel: string; loadingLabel: string }> {
  return {
    "mark-paid": { title: SUBJECT_COPY[subject].markPaidTitle, confirmLabel: "Mark as paid", loadingLabel: "Settling..." },
    resend: { title: "Resend all tickets", confirmLabel: "Resend all", loadingLabel: "Sending..." },
    "email-invoice": { title: "Email invoice to buyer", confirmLabel: "Send invoice", loadingLabel: "Sending..." },
  }
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
export function InvoiceSettlementActions({
  invoiceNo,
  canMarkAsPaid,
  canCancel,
  canResendTickets = false,
  canEmailInvoice = false,
  buyerEmail,
  markPaid,
  cancel: cancelMutation,
  resendTickets,
  emailInvoice,
  subject = "order",
  variant = "buttons",
  onView,
}: InvoiceSettlementActionsProps) {
  // `confirmAction` names which confirmation to show and is sticky across a close - only the open flags
  // drive visibility, so each dialog stays mounted after its first use and Ark's own close transition
  // (which releases the scroll lock and focus trap) runs before anything is torn down.
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const resendMutation = canResendTickets ? resendTickets : undefined
  const emailMutation = canEmailInvoice ? emailInvoice : undefined

  const isMenu = variant === "menu"
  if (!canMarkAsPaid && !canCancel && !resendMutation && !emailMutation && !(isMenu && onView)) {
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

  // Each action owns its own mutation so the success copy and cache invalidation stay distinct.
  const confirmMutation =
    (confirmAction === "email-invoice" ? emailMutation : confirmAction === "resend" ? resendMutation : undefined) ??
    markPaid
  const recipientLabel = buyerEmail?.trim() || "the buyer on file"
  const subjectCopy = SUBJECT_COPY[subject]
  const confirmCopy = confirmCopyFor(subject)

  const runThenClose = async (run: () => Promise<unknown>, close: () => void) => {
    try {
      await run()
      close()
    } catch {
      // Kept open so the dialog's own error banner stays on screen with the failed action in view.
    }
  }

  const dialogs = (
    <>
      {confirmAction ? (
        <ConfirmDialog
          open={isConfirmOpen}
          title={confirmCopy[confirmAction].title}
          description={
            confirmAction === "resend" ? (
              <Text>Re-email every ticket on this order to the buyer and any attendees with their own address?</Text>
            ) : confirmAction === "email-invoice" ? (
              <Text>
                Invoice <strong>{invoiceNo}</strong> and its online payable link will be emailed to{" "}
                <strong>{recipientLabel}</strong>.
              </Text>
            ) : (
              <Text>
                {subjectCopy.subjectLabel} <strong>{invoiceNo}</strong> {subjectCopy.markPaidConsequence} This
                cannot be undone.
              </Text>
            )
          }
          confirmLabel={confirmCopy[confirmAction].confirmLabel}
          loadingLabel={confirmCopy[confirmAction].loadingLabel}
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
          subject={subject}
          isPending={cancelMutation.isPending}
          errorMessage={cancelMutation.error ? extractApiError(cancelMutation.error) : null}
          onConfirm={(cancellationNotes) =>
            runThenClose(() => cancelMutation.mutateAsync(cancellationNotes), () => setIsCancelOpen(false))
          }
          onClose={() => setIsCancelOpen(false)}
        />
      ) : null}
    </>
  )

  if (isMenu) {
    return (
      <>
        <InvoiceSettlementActionsMenu
          invoiceNo={invoiceNo}
          onView={onView}
          onMarkPaid={canMarkAsPaid ? () => openConfirm("mark-paid") : undefined}
          onCancel={canCancel ? openCancel : undefined}
          onEmailInvoice={emailMutation ? () => openConfirm("email-invoice") : undefined}
        />
        {dialogs}
      </>
    )
  }

  return (
    <Box data-print-hide>
      <Flex justify="flex-end">
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

          {resendMutation ? (
            <Button variant="outline" colorPalette="brand" {...ACTION_BUTTON_PROPS} onClick={() => openConfirm("resend")}>
              <Send size={16} />
              Resend all tickets
            </Button>
          ) : null}

          {emailMutation ? (
            <Button variant="outline" colorPalette="brand" {...ACTION_BUTTON_PROPS} onClick={() => openConfirm("email-invoice")}>
              <Mail size={16} />
              Email invoice to buyer
            </Button>
          ) : null}

          {dialogs}
        </Stack>
      </Flex>
    </Box>
  )
}

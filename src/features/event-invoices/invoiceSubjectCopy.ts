/** What the settlement dialogs call the thing being settled: a ticket order or a custom invoice. */
export type InvoiceSubject = "order" | "invoice"

interface SubjectCopy {
  subjectLabel: string
  markPaidTitle: string
  markPaidConsequence: string
  cancelTitle: string
  cancelConfirmLabel: string
  cancelConsequence: string
  cancelReasonPlaceholder: string
}

/** A custom invoice has no seats or tickets, so its dialogs never promise either. */
export const SUBJECT_COPY: Record<InvoiceSubject, SubjectCopy> = {
  order: {
    subjectLabel: "Order",
    markPaidTitle: "Mark this order as paid",
    markPaidConsequence: "will be recorded as paid in full, the buyer emailed, and any tickets it is owed issued and delivered.",
    cancelTitle: "Cancel this order",
    cancelConfirmLabel: "Cancel order",
    cancelConsequence: "will be closed unpaid, the seats it holds released, and the buyer emailed. Its tickets can no longer be sent out.",
    cancelReasonPlaceholder: "Why is this order being cancelled?",
  },
  invoice: {
    subjectLabel: "Invoice",
    markPaidTitle: "Mark this invoice as paid",
    markPaidConsequence: "will be recorded as paid in full and the buyer emailed.",
    cancelTitle: "Cancel this invoice",
    cancelConfirmLabel: "Cancel invoice",
    cancelConsequence: "will be closed unpaid and the buyer emailed.",
    cancelReasonPlaceholder: "Why is this invoice being cancelled?",
  },
}

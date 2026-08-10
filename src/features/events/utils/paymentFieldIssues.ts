import type { PurchaseReviewIssue } from "@/features/events/components/registration/types"

export interface PaymentFieldState {
  hasSelectedMethod: boolean
  isCardMethod: boolean
  cardHolderName: string
  isChequeMethod: boolean
  chequeReferenceNo: string
}

/**
 * The fields the payment step collects itself, and nothing else. The Payment Element owns every card
 * field it renders, so its own submit() is what reports an incomplete card - the cardholder name is
 * ours to check because the Element is told not to collect it.
 *
 * The cheque reference is required for the same reason the server requires it: a cheque carries no
 * gateway transaction id, so it is the only link between the deposit and the invoice it settles.
 */
export function getPaymentFieldIssues(state: PaymentFieldState): PurchaseReviewIssue[] {
  if (!state.hasSelectedMethod) {
    return [{ message: "Select a payment method.", target: "payment-method" }]
  }

  if (state.isCardMethod && !state.cardHolderName.trim()) {
    return [{ message: "Enter the cardholder name.", target: "payment-method" }]
  }

  if (state.isChequeMethod && !state.chequeReferenceNo.trim()) {
    return [{ message: "Enter the cheque reference number.", target: "payment-method" }]
  }

  return []
}

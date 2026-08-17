import { useState } from "react"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import {
  PurchaseReviewDialog,
  type PurchaseReviewTicketRow,
} from "@/features/events/components/registration/PurchaseReviewDialog"
import type { EventCartPaymentCharge } from "@/features/events/schemas/eventCart.schemas"
import { extractApiError } from "@/utils/errors"

export interface PreparedPaymentIntent {
  clientSecret: string
  /**
   * Where a payment method that genuinely redirects sends the buyer back to. It points at the order,
   * not at this cart, because by then the cart is spent and the order is the only durable handle.
   */
  returnUrl: string
}

interface RegistrationPaymentConfirmationProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  eventTitle: string
  currencyCode: string | null
  accentColor: string
  selectedTicketCount: number
  paymentMethodLabel: string
  isCardPayment: boolean
  /**
   * Cheque is not a slower card. It never reaches Stripe, only an organizer may record it, and the
   * single call that records it also issues the tickets — so it finishes the checkout here rather
   * than handing the caller on to a payment form with nothing left to do.
   */
  isChequePayment: boolean
  /**
   * Nothing is payable, so no intent may be minted: the server refuses a zero-amount cart outright,
   * and confirming is the only call that turns it into an order.
   */
  isFreeOrder: boolean
  /** Collected outside the Payment Element, so it has to be supplied on confirm. */
  cardHolderName: string
  validationMessage: string | null
  ticketRows: PurchaseReviewTicketRow[]
  grossSubtotal: number
  discountAmount: number
  netSubtotal: number
  chargeRows: EventCartPaymentCharge[]
  grandTotal: number
  invoiceNote: string
  /** True while the wizard is persisting the order or reporting settlement back to the server. */
  isBusy: boolean
  onInvoiceNoteChange: (note: string) => void
  /** Validates and persists the order. Returning false leaves the dialog open with the complaint. */
  onPrepare: () => Promise<boolean>
  /** Mints the PaymentIntent for the selected method and yields what confirming it needs. */
  onCreateIntent: () => Promise<PreparedPaymentIntent>
  /** Records the cheque and takes the organizer to the order. Only called when isChequePayment. */
  onRecordCheque: () => Promise<void>
  /** Turns a free cart into an order and takes the buyer to it. Only called when isFreeOrder. */
  onConfirmFree: () => Promise<void>
  onPaid: () => Promise<void>
  onFailed: (message: string) => void
}

/**
 * Owns the confirm half of Stripe's deferred intent flow, which has to run in this order:
 * `elements.submit()` validates and tokenises what the buyer typed, the server then creates the
 * PaymentIntent, and `stripe.confirmPayment` charges it. Creating the intent last is what keeps an
 * abandoned review from leaving a half-open payment against the cart.
 */
export function RegistrationPaymentConfirmation({
  isBusy,
  isCardPayment,
  isChequePayment,
  isFreeOrder,
  cardHolderName,
  onPrepare,
  onCreateIntent,
  onRecordCheque,
  onConfirmFree,
  onPaid,
  onFailed,
  onOpenChange,
  ...dialogProps
}: RegistrationPaymentConfirmationProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isPaying, setIsPaying] = useState(false)

  async function handleConfirm() {
    if (!(await onPrepare())) {
      return
    }

    // First of all the branches: a free cart may carry a selected method, and honouring that choice
    // would send it to an endpoint that refuses a zero-amount order and hold the seats anyway.
    if (isFreeOrder) {
      await finishAsync(onConfirmFree)
      return
    }

    // Checked before the card branch and before the off-card one: a cheque has no intent to mint, so
    // reaching either of those would send it to an endpoint that refuses it and hold the seats anyway.
    if (isChequePayment) {
      await finishAsync(onRecordCheque)
      return
    }

    if (!isCardPayment) {
      await createIntentForOffCardMethod()
      return
    }

    await payWithStripeAsync()
  }

  /**
   * The two routes that finish the checkout in a single call and navigate away themselves. Only the
   * dialog is closed here — what they left behind on the server stands whether or not it closes.
   */
  async function finishAsync(complete: () => Promise<void>) {
    setIsPaying(true)

    try {
      await complete()
      onOpenChange(false)
    } catch (error) {
      onFailed(extractApiError(error))
    } finally {
      setIsPaying(false)
    }
  }

  /** Bank rails and cheques are carried on from here by their own flows, so only the intent is made. */
  async function createIntentForOffCardMethod() {
    try {
      await onCreateIntent()
      onOpenChange(false)
    } catch (error) {
      onFailed(extractApiError(error))
    }
  }

  async function payWithStripeAsync() {
    if (!stripe || !elements) {
      onFailed("The payment form is still loading. Try again in a moment.")
      return
    }

    setIsPaying(true)

    try {
      const { error: submitError } = await elements.submit()

      if (submitError) {
        onFailed(submitError.message ?? "Check the card details and try again.")
        return
      }

      const { clientSecret, returnUrl } = await onCreateIntent()
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          // Cards settle in place; only a method that genuinely needs a redirect leaves the page,
          // and it comes back to the order rather than to a cart that no longer means anything.
          return_url: returnUrl,
          payment_method_data: { billing_details: { name: cardHolderName.trim() } },
        },
        redirect: "if_required",
      })

      if (confirmError) {
        onFailed(confirmError.message ?? "The payment could not be completed.")
        return
      }

      await onPaid()
    } catch (error) {
      onFailed(extractApiError(error))
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <PurchaseReviewDialog
      {...dialogProps}
      isCardPayment={isCardPayment}
      isFreeOrder={isFreeOrder}
      onOpenChange={onOpenChange}
      isConfirming={isBusy || isPaying}
      onConfirm={handleConfirm}
    />
  )
}

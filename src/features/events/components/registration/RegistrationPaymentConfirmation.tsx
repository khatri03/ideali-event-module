import { useState } from "react"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import {
  PurchaseReviewDialog,
  type PurchaseReviewTicketRow,
} from "@/features/events/components/registration/PurchaseReviewDialog"
import type { EventCartPaymentCharge } from "@/features/events/schemas/eventCart.schemas"
import { extractApiError } from "@/utils/errors"

interface RegistrationPaymentConfirmationProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  eventTitle: string
  currencyCode: string | null
  accentColor: string
  selectedTicketCount: number
  selectedTicketTotal: number
  paymentMethodLabel: string
  isCardPayment: boolean
  /** Collected outside the Payment Element, so it has to be supplied on confirm. */
  cardHolderName: string
  validationMessage: string | null
  ticketRows: PurchaseReviewTicketRow[]
  chargeRows: EventCartPaymentCharge[]
  /** True while the wizard is persisting the order or reporting settlement back to the server. */
  isBusy: boolean
  /** Validates and persists the order. Returning false leaves the dialog open with the complaint. */
  onPrepare: () => Promise<boolean>
  /** Mints the PaymentIntent for the selected method and yields its client secret. */
  onCreateIntent: () => Promise<string>
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
  cardHolderName,
  onPrepare,
  onCreateIntent,
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

    if (!isCardPayment) {
      await createIntentForOffCardMethod()
      return
    }

    await payWithStripeAsync()
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

      const clientSecret = await onCreateIntent()
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          // Cards settle in place; only a method that genuinely needs a redirect leaves the page.
          return_url: window.location.href,
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
      onOpenChange={onOpenChange}
      isConfirming={isBusy || isPaying}
      onConfirm={handleConfirm}
    />
  )
}

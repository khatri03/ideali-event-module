import { useMemo, type ReactNode } from "react"
import { Elements } from "@stripe/react-stripe-js"
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js"
import { useStripeCredentials } from "@/features/events/hooks/useStripeCredentials"
import { toStripeMinorAmount } from "@/utils/stripeAmount"

interface RegistrationStripeProviderProps {
  paymentAccountUniqueId: string | null
  /** The payable total for the selected method, in display units. */
  amount: number
  currencyCode: string | null
  children: ReactNode
}

/**
 * Sets up Stripe.js for the registration wizard using the deferred intent flow: the Elements group
 * is created with `mode`, `amount` and `currency` instead of a client secret, so the payment form
 * renders before any PaymentIntent exists. The intent is minted only when the buyer confirms.
 *
 * Card payments are direct charges on the organizer's connected account, which is why Stripe.js is
 * initialised with the platform publishable key plus that account's id.
 */
export function RegistrationStripeProvider({
  paymentAccountUniqueId,
  amount,
  currencyCode,
  children,
}: RegistrationStripeProviderProps) {
  const { data: credentials } = useStripeCredentials(paymentAccountUniqueId)
  const publishableKey = credentials?.publishableKey ?? ""
  const stripeAccount = credentials?.stripeAccount?.trim() ?? ""
  const currency = currencyCode?.trim().toLowerCase() ?? ""

  const stripePromise = useMemo(() => {
    if (!publishableKey) {
      return null
    }

    return loadStripe(publishableKey, stripeAccount ? { stripeAccount } : undefined)
  }, [publishableKey, stripeAccount])

  const options = useMemo<StripeElementsOptions | null>(() => {
    const minorAmount = currency ? toStripeMinorAmount(amount) : 0

    if (minorAmount <= 0) {
      return null
    }

    return {
      mode: "payment",
      amount: minorAmount,
      currency,
      paymentMethodTypes: ["card"],
    }
  }, [amount, currency])

  // Elements rejects a zero amount in payment mode, so the group starts bare and is rebuilt once
  // there is a total to charge. The key forces that rebuild: `mode` cannot be added to a live
  // group, only `amount` can be updated on one that already has it.
  return (
    <Elements
      key={options ? "payment" : "idle"}
      stripe={stripePromise}
      options={options ?? undefined}
    >
      {children}
    </Elements>
  )
}

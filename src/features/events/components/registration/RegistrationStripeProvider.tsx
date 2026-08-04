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

/** Stands in until the cart is priced. Never charged - the server owns the PaymentIntent amount. */
const PLACEHOLDER_MINOR_AMOUNT = 100

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
    if (!currency) {
      return null
    }

    return {
      mode: "payment",
      // Elements rejects a zero amount in payment mode and refuses to have `mode` added to a live
      // group, so the group opens on a placeholder rather than opening bare and being rebuilt.
      // Amount is mutable, so the real total replaces it in place. The charged figure is the
      // server's PaymentIntent amount; this one only sizes what Stripe renders.
      amount: Math.max(toStripeMinorAmount(amount), PLACEHOLDER_MINOR_AMOUNT),
      currency,
      paymentMethodTypes: ["card"],
    }
  }, [amount, currency])

  // Keyed on the currency alone, which is fixed for the event. Keying on anything that moves during
  // the wizard - the cart total above all - remounts every child, and a buyer typing their details
  // when the cart is first priced loses the caret mid-word.
  return (
    <Elements key={currency || "idle"} stripe={stripePromise} options={options ?? undefined}>
      {children}
    </Elements>
  )
}

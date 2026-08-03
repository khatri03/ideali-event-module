/**
 * Converts a display amount into the smallest currency unit Stripe expects. The deferred Elements
 * flow needs the same figure the server puts on the PaymentIntent, so the two have to round
 * identically. Both supported currencies - USD and CAD - carry two decimals.
 */
export function toStripeMinorAmount(amount: number) {
  return Math.round(amount * 100)
}

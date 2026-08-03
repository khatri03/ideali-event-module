import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"

const serviceResponseSchema = z.object({
  Data: z.unknown().nullable().optional(),
  data: z.unknown().nullable().optional(),
})

const stripePublicCredentialsSchema = z.object({
  PublishableKey: z.string().optional(),
  publishableKey: z.string().optional(),
  StripeAccount: z.string().nullable().optional(),
  stripeAccount: z.string().nullable().optional(),
})

export interface StripePublicCredentials {
  publishableKey: string
  stripeAccount: string | null
}

/**
 * The publishable key and connected account the buyer's browser needs to mount Stripe fields. Card
 * fields render before any PaymentIntent exists, so these cannot come off an intent response.
 */
export async function fetchStripePublicCredentials(
  paymentAccountUniqueId: string,
): Promise<StripePublicCredentials> {
  const res = await client.get<unknown>(API_ROUTES.stripePublicCredentials(paymentAccountUniqueId))
  const envelope = serviceResponseSchema.parse(res.data)
  const parsed = stripePublicCredentialsSchema.parse(envelope.Data ?? envelope.data)

  return {
    publishableKey: parsed.PublishableKey ?? parsed.publishableKey ?? "",
    stripeAccount: parsed.StripeAccount ?? parsed.stripeAccount ?? null,
  }
}

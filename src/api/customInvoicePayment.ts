import { z } from "zod"
import { client } from "@/api/client"
import { assertSuccess, parseServicePayload, ServiceResponseError } from "@/api/serviceResponse"
import {
  normalizeCustomInvoicePaySummary,
  type CustomInvoicePaySummary,
} from "@/features/events/schemas/customInvoicePay.schemas"
import { API_ROUTES } from "@/utils/routes"
import { isNotFoundError } from "@/utils/errors"

export const PAYMENT_START_FAILED_MESSAGE = "Online payment could not be started. Please try again."

export interface CustomInvoicePaymentStart {
  clientSecret: string
  paymentIntentId: string
}

// Both values must be non-empty: a start without them cannot confirm a card against the intent.
const paymentStartSchema = z.object({
  clientSecret: z.string().min(1),
  paymentIntentId: z.string().min(1),
})

/**
 * Loads the buyer's view of a custom invoice. A 404 - an unknown id or a non-custom invoice - resolves
 * null so the page can show "not found" without treating it as a network error the buyer could retry past.
 */
export async function fetchCustomInvoicePaySummary(invoiceUniqueId: string): Promise<CustomInvoicePaySummary | null> {
  try {
    const response = await client.get<unknown>(API_ROUTES.customInvoicePay(invoiceUniqueId))
    return normalizeCustomInvoicePaySummary(parseServicePayload(response.data))
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }
    throw error
  }
}

/**
 * Opens a Stripe card payment for a custom invoice. The returned client secret is a payment credential
 * handed only to Stripe.js to confirm the card - this layer never logs, toasts or renders it.
 */
export async function startCustomInvoicePayment(invoiceUniqueId: string): Promise<CustomInvoicePaymentStart> {
  const response = await client.post<unknown>(API_ROUTES.customInvoicePay(invoiceUniqueId))
  assertSuccess(response.data, PAYMENT_START_FAILED_MESSAGE)

  const started = paymentStartSchema.safeParse(parseServicePayload(response.data) ?? {})
  if (!started.success) {
    throw new ServiceResponseError(PAYMENT_START_FAILED_MESSAGE)
  }

  return started.data
}

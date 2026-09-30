import { z } from "zod"

export const EVENT_INVOICE_PAY_STATES = ["Payable", "Paid", "Cancelled", "Unavailable"] as const

export type EventInvoicePayState = (typeof EVENT_INVOICE_PAY_STATES)[number]

const payLineItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
})

/**
 * The buyer-facing view of a custom invoice. The payload is camel-cased by `parseServicePayload` before
 * it reaches here, so this schema carries a single spelling. Amounts stay numbers and are formatted by
 * the page with `Intl.NumberFormat`.
 */
export const eventInvoicePaySummarySchema = z.object({
  invoiceNo: z.string(),
  eventName: z.string(),
  payState: z.enum(EVENT_INVOICE_PAY_STATES),
  currencyCode: z.string().nullable(),
  outstandingAmount: z.number(),
  /** Non-null only when the invoice is Payable - the account the anonymous start call charges against. */
  paymentAccountUniqueId: z.string().nullable(),
  lineItems: z.array(payLineItemSchema),
})

export type EventInvoicePaySummary = z.infer<typeof eventInvoicePaySummarySchema>

export function normalizeEventInvoicePaySummary(payload: unknown): EventInvoicePaySummary {
  return eventInvoicePaySummarySchema.parse(payload)
}

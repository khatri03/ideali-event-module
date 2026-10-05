import { z } from "zod"
import { CUSTOM_INVOICE_MODULES } from "@/api/customInvoices"

export const CUSTOM_INVOICE_PAY_STATES = ["Payable", "Paid", "Cancelled", "Unavailable"] as const

export type CustomInvoicePayState = (typeof CUSTOM_INVOICE_PAY_STATES)[number]

const payLineItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
})

/**
 * The buyer-facing view of a custom invoice. The payload is camel-cased by `parseServicePayload` before
 * it reaches here, so this schema carries a single spelling. Amounts stay numbers and are formatted by
 * the page with `Intl.NumberFormat`.
 */
export const customInvoicePaySummarySchema = z.object({
  invoiceNo: z.string(),
  /** Which module the billed record belongs to, so the page can label it "Event", "Membership" or "Campaign". */
  moduleType: z.enum(CUSTOM_INVOICE_MODULES),
  entityName: z.string(),
  payState: z.enum(CUSTOM_INVOICE_PAY_STATES),
  currencyCode: z.string().nullable(),
  outstandingAmount: z.number(),
  /** Non-null only when the invoice is Payable - the account the anonymous start call charges against. */
  paymentAccountUniqueId: z.string().nullable(),
  lineItems: z.array(payLineItemSchema),
})

export type CustomInvoicePaySummary = z.infer<typeof customInvoicePaySummarySchema>

export function normalizeCustomInvoicePaySummary(payload: unknown): CustomInvoicePaySummary {
  return customInvoicePaySummarySchema.parse(payload)
}

/** The only field the pay form owns: every card field lives in Stripe's Payment Element. */
export const invoicePayFormSchema = z.object({
  cardHolderName: z.string().trim().min(1, "Enter the name on the card.").max(100, "Keep the name under 100 characters."),
})

export type InvoicePayFormValues = z.infer<typeof invoicePayFormSchema>


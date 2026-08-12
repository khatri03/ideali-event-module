import { z } from "zod"

/** Mirrors the column widths the API refuses past, so an over-long value is caught before the request. */
const BUYER_NAME_MAX = 255
const BUYER_EMAIL_MAX = 255
const BUYER_PHONE_MAX = 50

export const buyerSchema = z.object({
  buyerName: z.string().trim().min(1, "Buyer name is required.").max(BUYER_NAME_MAX, `Keep the name under ${BUYER_NAME_MAX} characters.`),
  buyerEmail: z
    .email("Enter an email address the buyer can actually receive mail at.")
    .trim()
    .max(BUYER_EMAIL_MAX, `Keep the email under ${BUYER_EMAIL_MAX} characters.`),
  buyerPhone: z.string().trim().max(BUYER_PHONE_MAX, `Keep the phone under ${BUYER_PHONE_MAX} characters.`),
})

export type BuyerFormValues = z.infer<typeof buyerSchema>

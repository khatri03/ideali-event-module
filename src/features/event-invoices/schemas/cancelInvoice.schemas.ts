import { z } from "zod"

/** Mirrors the note length the cancel endpoint refuses past. */
export const CANCELLATION_NOTES_MAX = 400

export const cancelInvoiceSchema = z.object({
  cancellationNotes: z
    .string()
    .trim()
    .min(1, "Enter the reason for cancelling this order.")
    .max(CANCELLATION_NOTES_MAX, `Keep the reason under ${CANCELLATION_NOTES_MAX} characters.`),
})

export type CancelInvoiceFormValues = z.infer<typeof cancelInvoiceSchema>

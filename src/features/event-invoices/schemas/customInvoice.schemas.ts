import { z } from "zod"

/**
 * A single billed line. Amount stays decimal text - money never becomes a float in this app - and is held
 * to two decimal places and a positive value, with the same wording the server rejects it under.
 */
export const customInvoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Description is required."),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount greater than zero.")
    .refine((value) => Number(value) > 0, "Enter an amount greater than zero."),
})

/**
 * The custom-invoice create form. Messages are byte-identical to the C# service so the same rule reads the
 * same whether it is caught in the browser or returned by the API.
 */
export const customInvoiceSchema = z.object({
  eventUniqueId: z.string().min(1, "Select an event."),
  categoryUniqueId: z.string().min(1, "Select a sponsorship type."),
  /**
   * Set when the buyer was chosen from the member picker, cleared for a free-typed buyer. It rides along
   * so the server can link the invoice to the member (LD-6); the structured fields stay editable either way.
   */
  memberUniqueId: z.string().optional(),
  dueDate: z.string().min(1, "Payment due date is required."),
  companyName: z.string().trim().min(1, "Company name is required.").max(255),
  firstName: z.string().trim().max(255).optional(),
  middleName: z.string().trim().max(255).optional(),
  lastName: z.string().trim().min(1, "Last name is required.").max(255),
  cellPhone: z.string().trim().max(50).optional(),
  email: z.email("Enter an email address the buyer can actually receive mail at.").max(255),
  specialNotes: z.string().trim().max(2000, "Keep notes under 2000 characters.").optional(),
  lineItems: z.array(customInvoiceLineSchema).min(1, "Add at least one line item to bill for."),
})

export type CustomInvoiceLineValues = z.infer<typeof customInvoiceLineSchema>
export type CustomInvoiceFormValues = z.infer<typeof customInvoiceSchema>

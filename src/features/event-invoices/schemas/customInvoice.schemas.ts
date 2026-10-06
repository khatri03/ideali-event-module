import { z } from "zod"
import { CUSTOM_INVOICE_MODULES } from "@/api/customInvoices"

/** Positive decimal text with at most two places - the only amount shape a line may carry. */
export const LINE_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/**
 * A single billed line. Amount stays decimal text - money never becomes a float in this app - and is held
 * to two decimal places and a positive value, with the same wording the server rejects it under.
 */
export const customInvoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Description is required."),
  amount: z
    .string()
    .trim()
    .regex(LINE_AMOUNT_PATTERN, "Enter an amount greater than zero.")
    .refine((value) => Number(value) > 0, "Enter an amount greater than zero."),
})

const customInvoiceFields = z.object({
  moduleType: z.enum(CUSTOM_INVOICE_MODULES, { error: "Choose the module this invoice bills." }),
  entityUniqueId: z.string().min(1, "Choose what this invoice bills."),
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
  /**
   * Create only: email the buyer the payable link straight after the invoice is created. It drives the
   * follow-up send request and never reaches the write payload.
   */
  emailOnCreate: z.boolean(),
  /** The "Link to an existing invoice" switch. Off sends no link, whatever id is still held below. */
  linkToExisting: z.boolean(),
  linkedInvoiceUniqueId: z.string().optional(),
  /** The picked invoice's number, kept only to name it in the "Buyer copied from" banner. */
  linkedInvoiceNo: z.string().optional(),
})

type CustomInvoiceFieldValues = z.infer<typeof customInvoiceFields>

function requirePickedLinkWhenOn(values: CustomInvoiceFieldValues, context: z.RefinementCtx) {
  if (values.linkToExisting && !values.linkedInvoiceUniqueId) {
    context.addIssue({ code: "custom", path: ["linkedInvoiceUniqueId"], message: "Choose the invoice to link to." })
  }
}

/**
 * The custom-invoice create form. Messages are byte-identical to the C# service so the same rule reads the
 * same whether it is caught in the browser or returned by the API.
 */
export const customInvoiceSchema = customInvoiceFields.superRefine(requirePickedLinkWhenOn)

/**
 * The edit form. What an invoice bills is fixed at creation and the server keeps it, so a record deleted
 * since then must not block saving the rest of the invoice.
 */
export const customInvoiceEditSchema = customInvoiceFields
  .extend({ entityUniqueId: z.string() })
  .superRefine(requirePickedLinkWhenOn)

export type CustomInvoiceLineValues = z.infer<typeof customInvoiceLineSchema>
export type CustomInvoiceFormValues = z.infer<typeof customInvoiceSchema>

import { z } from "zod"

/** Mirrors the backend validation in InvoiceCategoryService exactly; message strings kept byte-identical. */
export const invoiceCategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required.")
    .min(2, "Category name must be at least 2 characters.")
    .max(100, "Category name must be 100 characters or fewer."),
  isActive: z.boolean(),
  /**
   * Held as text so the number input can be cleared without a cryptic NaN error; blank means "no explicit
   * order" and the caller collapses it to 0, the picker's default position.
   */
  displayOrder: z
    .string()
    .trim()
    .regex(/^\d*$/, "Display order must be a whole number, zero or greater."),
})

export type InvoiceCategoryFormValues = z.infer<typeof invoiceCategoryFormSchema>

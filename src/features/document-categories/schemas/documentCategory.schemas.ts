import { z } from "zod"

/** Mirrors the backend validation in DocumentCategoryService exactly; message strings kept byte-identical. */
export const documentCategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required.")
    .min(2, "Category name must be at least 2 characters.")
    .max(100, "Category name must be 100 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer."),
  /** Empty leaves the category visible to every member - the association narrows, it never opens. */
  membershipTypeUniqueIds: z.array(z.string()),
})

export type DocumentCategoryFormValues = z.infer<typeof documentCategoryFormSchema>

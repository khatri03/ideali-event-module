import { z } from "zod"

const chartColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{6})$/, "Choose a valid color.")

export const seatingLayoutCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(120, "Category name is too long."),
  color: chartColorSchema,
})

export type SeatingLayoutCategoryValues = z.infer<typeof seatingLayoutCategorySchema>

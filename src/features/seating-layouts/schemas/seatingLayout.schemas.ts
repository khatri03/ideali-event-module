import { z } from "zod"

export const seatingLayoutDesignerSchema = z.object({
  venueUniqueId: z.string().uuid("Choose a venue before opening the designer.").optional().or(z.literal("")),
  name: z.string().min(1, "Layout name is required.").max(120, "Layout name is too long."),
})

export type SeatingLayoutDesignerValues = z.infer<typeof seatingLayoutDesignerSchema>

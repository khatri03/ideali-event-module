import { z } from "zod"

export const chartLayoutDesignerSchema = z.object({
  venueUniqueId: z.string().uuid("Choose a venue before opening the designer."),
  name: z.string().min(1, "Layout name is required.").max(120, "Layout name is too long."),
  uniqueName: z.string().min(1, "Unique name is required.").max(120, "Unique name is too long."),
})

export type ChartLayoutDesignerValues = z.infer<typeof chartLayoutDesignerSchema>

import { z } from "zod"

export const reportTemplateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a template name.")
    .max(100, "Template name must be 100 characters or fewer."),
  fieldUniqueIds: z.array(z.string()).min(1, "Keep at least one column in the template."),
})

export type ReportTemplateFormValues = z.infer<typeof reportTemplateFormSchema>

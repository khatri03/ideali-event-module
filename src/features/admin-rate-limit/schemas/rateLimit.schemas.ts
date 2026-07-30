import { z } from "zod"

export const rateLimitFormSchema = z.object({
  permitLimit: z.number().int().min(1, "Must be at least 1.").max(1000, "Must be 1000 or fewer."),
  windowSeconds: z.number().int().min(1, "Must be at least 1 second.").max(3600, "Must be 3600 seconds or fewer."),
})

export type RateLimitFormValues = z.infer<typeof rateLimitFormSchema>

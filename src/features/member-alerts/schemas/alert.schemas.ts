import { z } from "zod"

/** Mirrors the backend validation in AlertService exactly; message strings kept byte-identical. */
export const alertFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters.")
      .max(200, "Title must be 200 characters or fewer."),
    body: z
      .string()
      .trim()
      .min(2, "Message must be at least 2 characters.")
      .max(10000, "Message must be 10000 characters or fewer."),
    priority: z.enum(["Urgent", "Important", "Normal", "Low"]),
    instant: z.boolean(),
    email: z.boolean(),
    scheduleForLater: z.boolean(),
    scheduledAtUtc: z.string().nullable(),
    recipientUniqueIds: z.array(z.string()),
    membershipTypeUniqueIds: z.array(z.string()),
    customListUniqueIds: z.array(z.string()),
  })
  .refine((values) => values.instant || values.email, {
    message: "Choose at least one delivery channel.",
    path: ["instant"],
  })
  .refine(
    (values) =>
      values.recipientUniqueIds.length > 0 ||
      values.membershipTypeUniqueIds.length > 0 ||
      values.customListUniqueIds.length > 0,
    {
      message: "Add at least one recipient, membership type, or custom list.",
      path: ["recipientUniqueIds"],
    },
  )
  .refine((values) => !values.scheduleForLater || Boolean(values.scheduledAtUtc), {
    message: "Pick a date and time to schedule.",
    path: ["scheduledAtUtc"],
  })
  .refine(
    (values) =>
      !values.scheduleForLater ||
      !values.scheduledAtUtc ||
      new Date(values.scheduledAtUtc).getTime() > Date.now(),
    {
      message: "Scheduled time must be in the future.",
      path: ["scheduledAtUtc"],
    },
  )

export type AlertFormValues = z.infer<typeof alertFormSchema>

/** Instant=1, Email=2 — the backend flags enum. */
export function toChannelMask(instant: boolean, email: boolean): number {
  return (instant ? 1 : 0) | (email ? 2 : 0)
}

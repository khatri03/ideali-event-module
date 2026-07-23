import { z } from "zod"
import { htmlToPlainText } from "@/utils/html"

/** Mirrors the backend validation in AlertService exactly; message strings kept byte-identical. */
export const alertFormSchema = z
  .object({
    targetMode: z.enum(["individuals", "membership-types", "custom-lists"]),
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters.")
      .max(200, "Title must be 200 characters or fewer."),
    body: z.string().superRefine((value, ctx) => {
      const visibleText = htmlToPlainText(value)

      if (!visibleText) {
        ctx.addIssue({
          code: "custom",
          message: "Message is required.",
        })
        return
      }

      if (visibleText.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Message must be at least 2 characters.",
        })
      }

      if (visibleText.length > 10000) {
        ctx.addIssue({
          code: "custom",
          message: "Message must be 10000 characters or fewer.",
        })
      }
    }),
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
      values.targetMode !== "individuals" || values.recipientUniqueIds.length > 0,
    {
      message: "Add at least one recipient.",
      path: ["recipientUniqueIds"],
    },
  )
  .refine(
    (values) =>
      values.targetMode !== "membership-types" || values.membershipTypeUniqueIds.length > 0,
    {
      message: "Select at least one membership type.",
      path: ["membershipTypeUniqueIds"],
    },
  )
  .refine(
    (values) =>
      values.targetMode !== "custom-lists" || values.customListUniqueIds.length > 0,
    {
      message: "Select at least one custom list.",
      path: ["customListUniqueIds"],
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

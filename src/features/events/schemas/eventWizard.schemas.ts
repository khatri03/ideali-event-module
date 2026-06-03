import { z } from "zod"

const eventSessionSchema = z.object({
  title: z.string().trim().min(1, "Session name is required"),
  startsAt: z.string().min(1, "Session start time is required"),
  endsAt: z.string().min(1, "Session end time is required"),
})

export const eventWizardSchema = z.object({
  name: z.string().trim().min(1, "Event name is required").max(120, "Keep the event name under 120 characters"),
  description: z.string().trim().max(5000, "Keep the description under 5000 characters"),
  themeColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color"),
  paymentAccountId: z.string().trim().min(1, "Payment account is required"),
  paymentMethods: z.array(z.number().int().positive()).min(1, "Select at least one payment method"),
  purchaseTimeLimitHours: z.number().int().positive().max(8760, "Use a reasonable number of hours").optional(),
  timeZone: z.string().trim().optional(),
  sessions: z.array(eventSessionSchema).default([]),
})

export type EventWizardValues = z.infer<typeof eventWizardSchema>
export type EventWizardSessionValues = z.infer<typeof eventSessionSchema>

export const eventWizardFieldGroups = {
  name: ["name"] as const,
  description: ["description"] as const,
  theme: ["themeColor"] as const,
  paymentAccount: ["paymentAccountId", "paymentMethods"] as const,
  timeZone: ["timeZone"] as const,
  sessions: ["sessions"] as const,
  advancedSettings: ["purchaseTimeLimitHours"] as const,
}

export const defaultEventWizardValues: EventWizardValues = {
  name: "",
  description: "",
  themeColor: "#7551FF",
  paymentAccountId: "",
  paymentMethods: [],
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  sessions: [],
}

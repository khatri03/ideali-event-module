import { z } from "zod"

const eventSessionSchema = z.object({
  title: z.string().trim().min(1, "Session name is required"),
  startsAt: z.string().min(1, "Session start time is required"),
  endsAt: z.string().min(1, "Session end time is required"),
})

const eventVisibilitySchema = z.enum(["Public", "Member", "Invitation"])

export const eventWizardSchema = z.object({
  name: z.string().trim().min(1, "Event name is required").max(120, "Keep the event name under 120 characters"),
  description: z.string().trim().max(5000, "Keep the description under 5000 characters"),
  termsConditions: z.string().trim().max(5000, "Keep the terms under 5000 characters"),
  bannerUrl: z.string().trim(),
  timeZoneId: z.number().int().positive().optional(),
  themeColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  visibility: eventVisibilitySchema,
  purchaseTimeLimitMinutes: z.number().int().min(5, "Choose a value between 5 and 60").max(60, "Choose a value between 5 and 60").optional(),
  paymentAccountId: z.string().trim().min(1, "Payment account is required"),
  paymentMethods: z.array(z.number().int().positive()).min(1, "Select at least one payment method"),
  venueUniqueId: z.string().trim().optional(),
  timeZone: z.string().trim().optional(),
  sessions: z.array(eventSessionSchema),
})

export type EventWizardValues = z.infer<typeof eventWizardSchema>
export type EventWizardSessionValues = z.infer<typeof eventSessionSchema>

export const eventWizardFieldGroups = {
  name: ["name"] as const,
  description: ["description"] as const,
  termsConditions: ["termsConditions"] as const,
  theme: ["themeColor"] as const,
  paymentAccount: ["paymentAccountId", "paymentMethods"] as const,
  venue: ["venueUniqueId"] as const,
  timeZone: ["timeZone"] as const,
  sessions: ["sessions"] as const,
  advancedSettings: ["purchaseTimeLimitMinutes", "visibility"] as const,
}

export const defaultEventWizardValues: EventWizardValues = {
  name: "",
  description: "",
  termsConditions: "",
  bannerUrl: "",
  timeZoneId: undefined,
  themeColor: "#7551FF",
  startDate: "",
  endDate: "",
  visibility: "Public",
  purchaseTimeLimitMinutes: 15,
  paymentAccountId: "",
  paymentMethods: [],
  venueUniqueId: "",
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  sessions: [],
}

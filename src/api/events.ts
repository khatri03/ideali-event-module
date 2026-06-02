import { z } from "zod"
import { client } from "@/api/client"
import type { PaginatedResponse } from "@/api/types"
import type { AppEvent, EventStatus, EventCategory } from "@/types"
import { API_ROUTES } from "@/utils/routes"

export interface EventFilters {
  search?: string
  status?: EventStatus
  category?: EventCategory
}

const appEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string(),
  category: z.enum(["conference", "workshop", "seminar", "concert", "sports", "networking", "webinar", "hackathon", "other"]),
  status: z.enum(["draft", "published", "ongoing", "completed", "cancelled"]),
  capacity: z.number(),
  attendees: z.number(),
  organizer: z.string(),
  coverColor: z.string(),
  price: z.number(),
  currency: z.string(),
  tags: z.array(z.string()),
  timeZone: z.string().optional(),
  paymentAccountId: z.string().optional(),
  purchaseTimeLimitHours: z.number().int().positive().nullable().optional(),
  sessions: z
    .array(
      z.object({
        title: z.string(),
        startsAt: z.string(),
        endsAt: z.string(),
      })
    )
    .optional(),
})

const eventWizardCreateResponseSchema = z.object({
  uniqueId: z.string().min(1),
})

const eventWizardCreateEnvelopeSchema = z.object({
  data: z.union([eventWizardCreateResponseSchema, z.string().min(1)]).nullable().optional(),
  success: z.boolean().optional(),
})

const eventWizardNameResponseSchema = z.object({
  name: z.string(),
})

const eventWizardDescriptionResponseSchema = z.object({
  description: z.string().nullable().optional(),
})

const eventWizardThemeColorResponseSchema = z.object({
  themeColor: z.string().nullable().optional(),
})

const eventWizardAdvancedSettingsResponseSchema = z.object({
  purchaseTimeLimit: z.number().int().positive().nullable().optional(),
})

export async function fetchEvents(
  filters?: EventFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<AppEvent>> {
  const res = await client.get<PaginatedResponse<AppEvent>>(API_ROUTES.events, { params: filters })
  const validated = z.array(appEventSchema).parse(res.data.items)
  return { ...res.data, items: validated }
}

export async function fetchEvent(id: string): Promise<AppEvent> {
  const res = await client.get<AppEvent>(API_ROUTES.eventById(id))
  return appEventSchema.parse(res.data)
}

export async function createEvent(payload: Omit<AppEvent, "id">): Promise<AppEvent> {
  const res = await client.post<AppEvent>(API_ROUTES.events, payload)
  return appEventSchema.parse(res.data)
}

export interface EventWizardCreateDraftRequest {
  name: string
}

export interface EventWizardCreateDraftResponse {
  uniqueId: string
}

export async function createEventDraft(
  payload: EventWizardCreateDraftRequest,
  stepNo = 1
): Promise<EventWizardCreateDraftResponse> {
  const res = await client.post<unknown>(API_ROUTES.eventWizardNameCreate, payload, {
    params: { stepNo },
  })

  const directResult = eventWizardCreateResponseSchema.safeParse(res.data)
  if (directResult.success) {
    return directResult.data
  }

  const envelopeResult = eventWizardCreateEnvelopeSchema.safeParse(res.data)
  if (envelopeResult.success && envelopeResult.data.data) {
    if (typeof envelopeResult.data.data === "string") {
      return { uniqueId: envelopeResult.data.data }
    }

    return envelopeResult.data.data
  }

  throw new Error("Invalid event draft response.")
}

export interface EventWizardNameResponse {
  name: string
}

export async function fetchEventWizardName(uniqueId: string): Promise<EventWizardNameResponse> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardName(uniqueId))
  return eventWizardNameResponseSchema.parse(res.data)
}

export async function updateEventWizardName(
  uniqueId: string,
  payload: EventWizardCreateDraftRequest,
  stepNo = 1
): Promise<EventWizardNameResponse> {
  const res = await client.post<unknown>(API_ROUTES.eventWizardName(uniqueId), payload, {
    params: { stepNo },
  })

  return eventWizardNameResponseSchema.parse(res.data)
}

export interface EventWizardDescriptionResponse {
  description?: string | null
}

export async function fetchEventWizardDescription(uniqueId: string): Promise<EventWizardDescriptionResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "description")}`)
  return eventWizardDescriptionResponseSchema.parse(res.data)
}

export async function updateEventWizardDescription(
  uniqueId: string,
  payload: { description: string },
  stepNo = 2
): Promise<EventWizardDescriptionResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "description")}`, payload, {
    params: { stepNo },
  })

  return eventWizardDescriptionResponseSchema.parse(res.data)
}

export interface EventWizardThemeColorResponse {
  themeColor?: string | null
}

export async function fetchEventWizardThemeColor(uniqueId: string): Promise<EventWizardThemeColorResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "theme-color")}`)
  return eventWizardThemeColorResponseSchema.parse(res.data)
}

export async function updateEventWizardThemeColor(
  uniqueId: string,
  payload: { themeColor: string | null },
  stepNo = 3
): Promise<EventWizardThemeColorResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "theme-color")}`, payload, {
    params: { stepNo },
  })

  return eventWizardThemeColorResponseSchema.parse(res.data)
}

export interface EventWizardAdvancedSettingsResponse {
  purchaseTimeLimit?: number | null
}

export async function fetchEventWizardAdvancedSettings(uniqueId: string): Promise<EventWizardAdvancedSettingsResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "advanced-settings")}`)
  return eventWizardAdvancedSettingsResponseSchema.parse(res.data)
}

export async function updateEventWizardAdvancedSettings(
  uniqueId: string,
  payload: { purchaseTimeLimit: number | null },
  stepNo = 10
): Promise<EventWizardAdvancedSettingsResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "advanced-settings")}`, payload, {
    params: { stepNo },
  })

  return eventWizardAdvancedSettingsResponseSchema.parse(res.data)
}

export async function updateEvent(id: string, payload: Partial<Omit<AppEvent, "id">>): Promise<AppEvent> {
  const res = await client.patch<AppEvent>(API_ROUTES.eventById(id), payload)
  return appEventSchema.parse(res.data)
}

export async function deleteEvent(id: string): Promise<void> {
  await client.delete(API_ROUTES.eventById(id))
}

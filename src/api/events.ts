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

export async function updateEvent(id: string, payload: Partial<Omit<AppEvent, "id">>): Promise<AppEvent> {
  const res = await client.patch<AppEvent>(API_ROUTES.eventById(id), payload)
  return appEventSchema.parse(res.data)
}

export async function deleteEvent(id: string): Promise<void> {
  await client.delete(API_ROUTES.eventById(id))
}

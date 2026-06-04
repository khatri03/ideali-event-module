import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"

const serviceResponseSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().nullable().optional(),
    errorCode: z.string().nullable().optional(),
    validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
    meta: z.record(z.string(), z.unknown()).nullable().optional(),
    timestamp: z.string().optional(),
    Data: z.unknown().optional(),
    data: z.unknown().optional(),
  })
  .passthrough()

const sessionNameSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
})

const sessionDescriptionSchema = z.object({
  Description: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

const sessionVenueSchema = z.object({
  VenueUniqueId: z.string().optional(),
  venueUniqueId: z.string().optional(),
})

const sessionBookingSchema = z.object({
  BookingStartDate: z.string().nullable().optional(),
  bookingStartDate: z.string().nullable().optional(),
  BookingEndDate: z.string().nullable().optional(),
  bookingEndDate: z.string().nullable().optional(),
})

const sessionDurationSchema = z.object({
  StartDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  EndDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
})

const sessionEventSchema = z.object({
  EventUniqueId: z.string().optional(),
  eventUniqueId: z.string().optional(),
})

const sessionProgressSchema = z.object({
  stepNo: z.number().int().min(0),
})

const sessionScheduleSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  ScheduleTime: z.string().optional(),
  scheduleTime: z.string().optional(),
})

const sessionScheduleListSchema = z.array(sessionScheduleSchema)

function readResponseData(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload
  }

  if ("Data" in payload) {
    return (payload as { Data?: unknown }).Data
  }

  if ("data" in payload) {
    return (payload as { data?: unknown }).data
  }

  return payload
}

function parseServicePayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload
  }

  const serviceResponse = serviceResponseSchema.parse(payload)
  return readResponseData(serviceResponse)
}

export interface SessionWizardName {
  uniqueId: string
  name: string
}

export interface SessionWizardDescription {
  description: string | null
}

export interface SessionWizardVenue {
  venueUniqueId: string
}

export interface SessionWizardEvent {
  eventUniqueId: string
}

export interface SessionWizardBooking {
  bookingStartDate: string | null
  bookingEndDate: string | null
}

export interface SessionWizardDuration {
  startDate: string | null
  endDate: string | null
}

export interface SessionWizardNameRequest {
  name: string
}

export interface SessionWizardDescriptionRequest {
  description: string | null
}

export interface SessionWizardVenueRequest {
  venueUniqueId: string
}

export interface SessionWizardEventRequest {
  eventUniqueId: string
}

export interface SessionWizardBookingRequest {
  bookingStartDate: string | null
  bookingEndDate: string | null
}

export interface SessionWizardDurationRequest {
  startDate: string | null
  endDate: string | null
}

export interface SessionWizardProgressResponse {
  stepNo: number
}

export interface SessionWizardSchedule {
  uniqueId: string
  name: string
  scheduleTime: string
}

export interface SessionWizardScheduleRequest {
  name: string
  scheduleTime: string
}

function normalizeScheduleTime(value: string | undefined): string {
  if (!value) {
    return ""
  }

  return value.length >= 5 ? value.slice(0, 5) : value
}

export async function fetchSessionWizardName(uniqueId: string): Promise<SessionWizardName> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardName(uniqueId))
  const responseData = parseServicePayload(res.data)
  const session = sessionNameSchema.parse(responseData)

  return {
    uniqueId: session.UniqueId ?? session.uniqueId ?? "",
    name: session.Name ?? session.name ?? "",
  }
}

export async function updateSessionWizardName(
  uniqueId: string,
  payload: SessionWizardNameRequest,
  stepNo = 1,
): Promise<SessionWizardName> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardName(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const session = sessionNameSchema.parse(responseData)

  return {
    uniqueId: session.UniqueId ?? session.uniqueId ?? "",
    name: session.Name ?? session.name ?? "",
  }
}

export async function fetchSessionWizardDescription(uniqueId: string): Promise<SessionWizardDescription> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardDescription(uniqueId))
  const responseData = parseServicePayload(res.data)
  const description = sessionDescriptionSchema.parse(responseData)

  return {
    description: description.Description ?? description.description ?? null,
  }
}

export async function updateSessionWizardDescription(
  uniqueId: string,
  payload: SessionWizardDescriptionRequest,
  stepNo = 2,
): Promise<SessionWizardDescription> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardDescription(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const description = sessionDescriptionSchema.parse(responseData)

  return {
    description: description.Description ?? description.description ?? null,
  }
}

export async function skipSessionWizardStep(uniqueId: string, stepNo: number): Promise<SessionWizardProgressResponse> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardSkip(uniqueId), null, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  return sessionProgressSchema.parse(responseData)
}

export async function fetchSessionWizardEvent(uniqueId: string): Promise<SessionWizardEvent> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardEvent(uniqueId))
  const responseData = parseServicePayload(res.data)
  const sessionEvent = sessionEventSchema.parse(responseData)

  return {
    eventUniqueId: sessionEvent.EventUniqueId ?? sessionEvent.eventUniqueId ?? "",
  }
}

export async function updateSessionWizardEvent(
  uniqueId: string,
  payload: SessionWizardEventRequest,
  stepNo = 3,
): Promise<SessionWizardEvent> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardEvent(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const sessionEvent = sessionEventSchema.parse(responseData)

  return {
    eventUniqueId: sessionEvent.EventUniqueId ?? sessionEvent.eventUniqueId ?? "",
  }
}

export async function fetchSessionWizardVenue(uniqueId: string): Promise<SessionWizardVenue> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardVenue(uniqueId))
  const responseData = parseServicePayload(res.data)
  const venue = sessionVenueSchema.parse(responseData)

  return {
    venueUniqueId: venue.VenueUniqueId ?? venue.venueUniqueId ?? "",
  }
}

export async function updateSessionWizardVenue(
  uniqueId: string,
  payload: SessionWizardVenueRequest,
  stepNo = 4,
): Promise<SessionWizardVenue> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardVenue(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const venue = sessionVenueSchema.parse(responseData)

  return {
    venueUniqueId: venue.VenueUniqueId ?? venue.venueUniqueId ?? "",
  }
}

export async function fetchSessionWizardBooking(uniqueId: string): Promise<SessionWizardBooking> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardBooking(uniqueId))
  const responseData = parseServicePayload(res.data)
  const booking = sessionBookingSchema.parse(responseData)

  return {
    bookingStartDate: booking.BookingStartDate ?? booking.bookingStartDate ?? null,
    bookingEndDate: booking.BookingEndDate ?? booking.bookingEndDate ?? null,
  }
}

export async function updateSessionWizardBooking(
  uniqueId: string,
  payload: SessionWizardBookingRequest,
  stepNo = 5,
): Promise<SessionWizardBooking> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardBooking(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const booking = sessionBookingSchema.parse(responseData)

  return {
    bookingStartDate: booking.BookingStartDate ?? booking.bookingStartDate ?? null,
    bookingEndDate: booking.BookingEndDate ?? booking.bookingEndDate ?? null,
  }
}

export async function fetchSessionWizardDuration(uniqueId: string): Promise<SessionWizardDuration> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardDuration(uniqueId))
  const responseData = parseServicePayload(res.data)
  const duration = sessionDurationSchema.parse(responseData)

  return {
    startDate: duration.StartDate ?? duration.startDate ?? null,
    endDate: duration.EndDate ?? duration.endDate ?? null,
  }
}

export async function updateSessionWizardDuration(
  uniqueId: string,
  payload: SessionWizardDurationRequest,
  stepNo = 6,
): Promise<SessionWizardDuration> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardDuration(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const duration = sessionDurationSchema.parse(responseData)

  return {
    startDate: duration.StartDate ?? duration.startDate ?? null,
    endDate: duration.EndDate ?? duration.endDate ?? null,
  }
}

export async function fetchSessionWizardSchedule(uniqueId: string): Promise<SessionWizardSchedule[]> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardSchedule(uniqueId))
  const responseData = parseServicePayload(res.data)
  const schedules = sessionScheduleListSchema.parse(responseData)

  return schedules.map((schedule) => ({
    uniqueId: schedule.UniqueId ?? schedule.uniqueId ?? "",
    name: schedule.Name ?? schedule.name ?? "",
    scheduleTime: normalizeScheduleTime(schedule.ScheduleTime ?? schedule.scheduleTime),
  }))
}

export async function createSessionWizardSchedule(
  uniqueId: string,
  payload: SessionWizardScheduleRequest,
): Promise<SessionWizardSchedule> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardSchedule(uniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const schedule = sessionScheduleSchema.parse(responseData)

  return {
    uniqueId: schedule.UniqueId ?? schedule.uniqueId ?? "",
    name: schedule.Name ?? schedule.name ?? "",
    scheduleTime: normalizeScheduleTime(schedule.ScheduleTime ?? schedule.scheduleTime),
  }
}

export async function updateSessionWizardSchedule(
  uniqueId: string,
  scheduleUniqueId: string,
  payload: SessionWizardScheduleRequest,
): Promise<SessionWizardSchedule> {
  const res = await client.put<unknown>(API_ROUTES.sessionWizardScheduleItem(uniqueId, scheduleUniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const schedule = sessionScheduleSchema.parse(responseData)

  return {
    uniqueId: schedule.UniqueId ?? schedule.uniqueId ?? "",
    name: schedule.Name ?? schedule.name ?? "",
    scheduleTime: normalizeScheduleTime(schedule.ScheduleTime ?? schedule.scheduleTime),
  }
}

export async function deleteSessionWizardSchedule(uniqueId: string, scheduleUniqueId: string): Promise<void> {
  await client.delete(API_ROUTES.sessionWizardScheduleItem(uniqueId, scheduleUniqueId))
}

export async function fetchSessionWizardProgress(uniqueId: string): Promise<SessionWizardProgressResponse> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardProgress(uniqueId))
  const responseData = parseServicePayload(res.data)
  return sessionProgressSchema.parse(responseData)
}

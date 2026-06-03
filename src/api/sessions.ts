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

export interface SessionWizardNameRequest {
  name: string
}

export interface SessionWizardDescriptionRequest {
  description: string | null
}

export interface SessionWizardVenueRequest {
  venueUniqueId: string
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
): Promise<SessionWizardName> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardName(uniqueId), payload)
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
): Promise<SessionWizardDescription> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardDescription(uniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const description = sessionDescriptionSchema.parse(responseData)

  return {
    description: description.Description ?? description.description ?? null,
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
): Promise<SessionWizardVenue> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardVenue(uniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const venue = sessionVenueSchema.parse(responseData)

  return {
    venueUniqueId: venue.VenueUniqueId ?? venue.venueUniqueId ?? "",
  }
}

import { z } from "zod"
import { client } from "@/api/client"
import type { ServiceResponse } from "@/api/types"
import { API_ROUTES } from "@/utils/routes"

const serviceResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  timestamp: z.string().optional(),
  Data: z.unknown().optional(),
  data: z.unknown().optional(),
})

const organizerVenueSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
})

const organizerEventSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
})

const organizerEventListEnvelopeSchema = z.object({
  PageNo: z.number().int().optional(),
  pageNo: z.number().int().optional(),
  PageSize: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  PageCount: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  TotalRecordsCount: z.number().int().optional(),
  totalRecordsCount: z.number().int().optional(),
  PageData: z.array(organizerEventSchema).optional(),
  pageData: z.array(organizerEventSchema).optional(),
})

export interface OrganizerVenueOption {
  uniqueId: string
  name: string
}

export interface OrganizerVenueCreateRequest {
  name: string
}

export interface OrganizerEventOption {
  uniqueId: string
  name: string
}

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
  const serviceResponse = serviceResponseSchema.parse(payload) as ServiceResponse<unknown> & { Data?: unknown }
  return readResponseData(serviceResponse)
}

function normalizeOrganizerEvent(item: z.infer<typeof organizerEventSchema>): OrganizerEventOption {
  return {
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
  }
}

async function fetchOrganizerEventsPage(pageNo: number, pageSize: number): Promise<{
  pageData: OrganizerEventOption[]
  totalPages: number
}> {
  const res = await client.get<unknown>(API_ROUTES.organizerEvents, {
    params: { pageNo, pageSize },
  })
  const responseData = parseServicePayload(res.data)
  const parsed = organizerEventListEnvelopeSchema.parse(responseData)
  const pageData = parsed.PageData ?? parsed.pageData ?? []
  const totalPages = parsed.PageCount ?? parsed.pageCount ?? 1

  return {
    pageData: pageData.map(normalizeOrganizerEvent),
    totalPages,
  }
}

export async function fetchOrganizerVenues(): Promise<OrganizerVenueOption[]> {
  const res = await client.get<unknown>(API_ROUTES.organizerVenues)
  const responseData = parseServicePayload(res.data)

  return z.array(organizerVenueSchema).parse(responseData).map((item) => ({
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
  }))
}

export async function createOrganizerVenue(payload: OrganizerVenueCreateRequest): Promise<OrganizerVenueOption> {
  const res = await client.post<unknown>(API_ROUTES.organizerVenueCreate, payload)
  const responseData = parseServicePayload(res.data)
  const venue = organizerVenueSchema.parse(responseData)

  return {
    uniqueId: venue.UniqueId ?? venue.uniqueId ?? "",
    name: venue.Name ?? venue.name ?? "",
  }
}

export async function fetchOrganizerEvents(): Promise<OrganizerEventOption[]> {
  const pageSize = 200
  const { pageData: firstPage, totalPages } = await fetchOrganizerEventsPage(1, pageSize)

  if (totalPages <= 1) {
    return firstPage
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchOrganizerEventsPage(index + 2, pageSize)),
  )

  const merged = [...firstPage, ...remainingPages.flatMap((page) => page.pageData)]
  const deduped = new Map<string, OrganizerEventOption>()

  merged.forEach((event) => {
    if (!event.uniqueId) {
      return
    }
    deduped.set(event.uniqueId, event)
  })

  return [...deduped.values()]
}

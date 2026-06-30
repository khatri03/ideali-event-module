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
  MapUrl: z.string().nullable().optional(),
  mapUrl: z.string().nullable().optional(),
  Latitude: z.number().nullable().optional(),
  latitude: z.number().nullable().optional(),
  Longitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  SessionCount: z.number().int().optional(),
  sessionCount: z.number().int().optional(),
  CreatedOnUtc: z.string().optional(),
  createdOnUtc: z.string().optional(),
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

const organizerVenueManagementListEnvelopeSchema = z.object({
  PageNo: z.number().int().optional(),
  pageNo: z.number().int().optional(),
  PageSize: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  PageCount: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  TotalRecordsCount: z.number().int().optional(),
  totalRecordsCount: z.number().int().optional(),
  PageData: z.array(organizerVenueSchema).optional(),
  pageData: z.array(organizerVenueSchema).optional(),
})

export interface OrganizerVenueOption {
  uniqueId: string
  name: string
}

export interface OrganizerVenueCreateRequest {
  name: string
  mapUrl?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface OrganizerVenueManagementItem {
  uniqueId: string
  name: string
  mapUrl: string | null
  latitude: number | null
  longitude: number | null
  sessionCount: number
  createdOnUtc: string
}

export interface OrganizerVenueManagementFilters {
  name?: string
  hasSessions?: boolean | null
  sortBy?: string | null
  sortOrder?: string | null
}

export interface OrganizerVenueManagementListResponse {
  items: OrganizerVenueManagementItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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

function normalizeVenue(item: z.infer<typeof organizerVenueSchema>): OrganizerVenueOption {
  return {
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
  }
}

function normalizeVenueManagementItem(item: z.infer<typeof organizerVenueSchema>): OrganizerVenueManagementItem {
  return {
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
    mapUrl: item.MapUrl ?? item.mapUrl ?? null,
    latitude: item.Latitude ?? item.latitude ?? null,
    longitude: item.Longitude ?? item.longitude ?? null,
    sessionCount: item.SessionCount ?? item.sessionCount ?? 0,
    createdOnUtc: item.CreatedOnUtc ?? item.createdOnUtc ?? "",
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

  return z.array(organizerVenueSchema).parse(responseData).map(normalizeVenue)
}

export async function createOrganizerVenue(payload: OrganizerVenueCreateRequest): Promise<OrganizerVenueOption> {
  const res = await client.post<unknown>(API_ROUTES.organizerVenueCreate, payload)
  const responseData = parseServicePayload(res.data)
  const venue = organizerVenueSchema.parse(responseData)

  return normalizeVenue(venue)
}

export async function updateOrganizerVenue(uniqueId: string, payload: OrganizerVenueCreateRequest): Promise<OrganizerVenueOption> {
  const res = await client.post<unknown>(API_ROUTES.organizerVenueUpdate(uniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const venue = organizerVenueSchema.parse(responseData)

  return normalizeVenue(venue)
}

export async function fetchOrganizerVenueManagementList(
  filters: OrganizerVenueManagementFilters,
  pageNo: number,
  pageSize: number,
): Promise<OrganizerVenueManagementListResponse> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))

  if (filters.name?.trim()) {
    params.set("name", filters.name.trim())
  }

  if (filters.hasSessions !== null && filters.hasSessions !== undefined) {
    params.set("hasSessions", String(filters.hasSessions))
  }

  if (filters.sortBy) {
    params.set("sortBy", filters.sortBy)
  }

  if (filters.sortOrder) {
    params.set("sortOrder", filters.sortOrder)
  }

  const res = await client.get<unknown>(API_ROUTES.organizerVenueManagementList, {
    params,
  })
  const responseData = parseServicePayload(res.data)
  const parsed = organizerVenueManagementListEnvelopeSchema.parse(responseData)
  const pageData = parsed.PageData ?? parsed.pageData ?? []
  const page = parsed.PageNo ?? parsed.pageNo ?? pageNo
  const resolvedPageSize = parsed.PageSize ?? parsed.pageSize ?? pageSize
  const total = parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? 0
  const totalPages = parsed.PageCount ?? parsed.pageCount ?? 1

  return {
    items: pageData.map(normalizeVenueManagementItem),
    page,
    pageSize: resolvedPageSize,
    total,
    totalPages,
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

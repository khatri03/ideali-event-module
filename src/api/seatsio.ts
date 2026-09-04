import { isAxiosError } from "axios"
import { z } from "zod"
import { client } from "@/api/client"
import { assertSuccess } from "@/api/serviceResponse"
import type { PaginatedResponse, ServiceResponse } from "@/api/types"
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

const seatsIoWorkspaceSchema = z.object({
  Id: z.number().int().optional(),
  id: z.number().int().optional(),
  Name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  Key: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  Region: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  SecretKey: z.string().nullable().optional(),
  secretKey: z.string().nullable().optional(),
  IsDefault: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  IsTest: z.boolean().optional(),
  isTest: z.boolean().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

const seatsIoSeatingLayoutSchema = z.object({
  Id: z.number().int().optional(),
  id: z.number().int().optional(),
  UniqueId: z.string().nullable().optional(),
  uniqueId: z.string().nullable().optional(),
  VenueUniqueId: z.string().nullable().optional(),
  venueUniqueId: z.string().nullable().optional(),
  VenueName: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  Name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  SeatsIoChartKey: z.string().nullable().optional(),
  seatsIoChartKey: z.string().nullable().optional(),
})

const seatsIoChartCategorySchema = z.object({
  Id: z.number().int().optional(),
  id: z.number().int().optional(),
  UniqueId: z.string().nullable().optional(),
  uniqueId: z.string().nullable().optional(),
  ChartUniqueId: z.string().nullable().optional(),
  chartUniqueId: z.string().nullable().optional(),
  Key: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  Name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  Label: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  Color: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  DisplayOrder: z.number().int().nullable().optional(),
  displayOrder: z.number().int().nullable().optional(),
})

const seatsIoEventSchema = z.object({
  Id: z.number().int().optional(),
  id: z.number().int().optional(),
  UniqueId: z.string().nullable().optional(),
  uniqueId: z.string().nullable().optional(),
  ChartUniqueId: z.string().nullable().optional(),
  chartUniqueId: z.string().nullable().optional(),
  Label: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  SeatsIoEventKey: z.string().nullable().optional(),
  seatsIoEventKey: z.string().nullable().optional(),
  SeatsIoChartKey: z.string().nullable().optional(),
  seatsIoChartKey: z.string().nullable().optional(),
})

const seatsIoSeatingLayoutDetailSchema = seatsIoSeatingLayoutSchema.extend({
  Categories: z.array(seatsIoChartCategorySchema).optional(),
  categories: z.array(seatsIoChartCategorySchema).optional(),
})

const seatsIoChartValidationSchema = z.object({
  ChartKey: z.string().nullable().optional(),
  chartKey: z.string().nullable().optional(),
  IsValid: z.boolean().optional(),
  isValid: z.boolean().optional(),
  Summary: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  Issues: z.array(z.string()).optional(),
  issues: z.array(z.string()).optional(),
})

const seatsIoSeatingLayoutsPageSchema = z.object({
  PageNo: z.number().int().optional(),
  pageNo: z.number().int().optional(),
  PageSize: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  PageCount: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  TotalRecordsCount: z.number().int().optional(),
  totalRecordsCount: z.number().int().optional(),
  PageData: z.array(seatsIoSeatingLayoutSchema).optional(),
  pageData: z.array(seatsIoSeatingLayoutSchema).optional(),
})

export interface SeatsIoWorkspace {
  id: number
  name: string
  publicKey: string
  region: string
  secretKey: string
  isDefault: boolean
  isTest: boolean
  isActive: boolean
}

export interface SeatsIoSeatingLayout {
  id: number
  uniqueId: string
  venueUniqueId: string | null
  venueName: string | null
  name: string
  seatsIoChartKey: string | null
}

export interface SeatsIoSeatingLayoutDetail extends SeatsIoSeatingLayout {
  categories: SeatsIoChartCategory[]
}

export interface SeatsIoChartValidation {
  chartKey: string
  isValid: boolean
  summary: string
  issues: string[]
}

export interface SeatsIoChartCategory {
  id: number
  uniqueId: string
  chartUniqueId: string
  key: string
  name: string
  color: string
  displayOrder: number
}

export interface SeatsIoChartEvent {
  id: number
  uniqueId: string
  chartUniqueId: string
  label: string
  seatsIoEventKey: string | null
  seatsIoChartKey: string | null
}

export interface SeatsIoChartCategoryRequest {
  name: string
  color: string
}

export interface SeatsIoSeatingLayoutRequest {
  venueUniqueId?: string | null
  name: string
  seatsIoChartKey?: string
}

export type SeatsIoSeatingLayoutsPage = PaginatedResponse<SeatsIoSeatingLayout>

function readServiceResponseData(payload: unknown): unknown {
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

function parseServiceResponseData(payload: unknown): unknown {
  const serviceResponse = serviceResponseSchema.parse(payload) as ServiceResponse<unknown> & {
    Data?: unknown
    data?: unknown
  }

  return readServiceResponseData(serviceResponse)
}

function normalizeWorkspace(item: z.infer<typeof seatsIoWorkspaceSchema>): SeatsIoWorkspace {
  const region = (item.Region ?? item.region ?? "").trim().toLowerCase()
  return {
    id: item.Id ?? item.id ?? 0,
    name: item.Name ?? item.name ?? "",
    publicKey: item.Key ?? item.key ?? "",
    region,
    secretKey: item.SecretKey ?? item.secretKey ?? "",
    isDefault: item.IsDefault ?? item.isDefault ?? false,
    isTest: item.IsTest ?? item.isTest ?? false,
    isActive: item.IsActive ?? item.isActive ?? false,
  }
}

function normalizeSeatingLayout(item: z.infer<typeof seatsIoSeatingLayoutSchema>): SeatsIoSeatingLayout {
  return {
    id: item.Id ?? item.id ?? 0,
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    venueUniqueId: item.VenueUniqueId ?? item.venueUniqueId ?? null,
    venueName: item.VenueName ?? item.venueName ?? null,
    name: item.Name ?? item.name ?? "",
    seatsIoChartKey: item.SeatsIoChartKey ?? item.seatsIoChartKey ?? null,
  }
}

function normalizeSeatingLayoutDetail(item: z.infer<typeof seatsIoSeatingLayoutDetailSchema>): SeatsIoSeatingLayoutDetail {
  const normalized = normalizeSeatingLayout(item)
  const categories = (item.Categories ?? item.categories ?? []).map((category) =>
    normalizeChartCategory(seatsIoChartCategorySchema.parse(category))
  )

  return {
    ...normalized,
    categories,
  }
}

function normalizeChartValidation(item: z.infer<typeof seatsIoChartValidationSchema>): SeatsIoChartValidation {
  return {
    chartKey: item.ChartKey ?? item.chartKey ?? "",
    isValid: item.IsValid ?? item.isValid ?? false,
    summary: item.Summary ?? item.summary ?? "",
    issues: item.Issues ?? item.issues ?? [],
  }
}

function normalizeChartCategory(item: z.infer<typeof seatsIoChartCategorySchema>): SeatsIoChartCategory {
  return {
    id: item.Id ?? item.id ?? 0,
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    chartUniqueId: item.ChartUniqueId ?? item.chartUniqueId ?? "",
    key: item.Key ?? item.key ?? "",
    name: item.Name ?? item.name ?? item.Label ?? item.label ?? "",
    color: item.Color ?? item.color ?? "",
    displayOrder: item.DisplayOrder ?? item.displayOrder ?? 0,
  }
}

function normalizeChartEvent(item: z.infer<typeof seatsIoEventSchema>): SeatsIoChartEvent {
  return {
    id: item.Id ?? item.id ?? 0,
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    chartUniqueId: item.ChartUniqueId ?? item.chartUniqueId ?? "",
    label: item.Label ?? item.label ?? "",
    seatsIoEventKey: item.SeatsIoEventKey ?? item.seatsIoEventKey ?? null,
    seatsIoChartKey: item.SeatsIoChartKey ?? item.seatsIoChartKey ?? null,
  }
}

function normalizeChartCategoryList(payload: unknown): SeatsIoChartCategory[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeChartCategory(seatsIoChartCategorySchema.parse(item)))
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as {
      PageData?: unknown
      pageData?: unknown
      Categories?: unknown
      categories?: unknown
    }

    const list = candidate.PageData ?? candidate.pageData ?? candidate.Categories ?? candidate.categories
    if (Array.isArray(list)) {
      return list.map((item) => normalizeChartCategory(seatsIoChartCategorySchema.parse(item)))
    }
  }

  return []
}

export async function fetchSeatsIoWorkspace(): Promise<SeatsIoWorkspace | null> {
  try {
    const res = await client.get<unknown>(API_ROUTES.seatsIoWorkspace)
    const responseData = parseServiceResponseData(res.data)

    if (!responseData) {
      return null
    }

    return normalizeWorkspace(seatsIoWorkspaceSchema.parse(responseData))
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null
    }

    throw error
  }
}

export async function createSeatsIoWorkspace(): Promise<SeatsIoWorkspace> {
  const res = await client.post<unknown>(API_ROUTES.seatsIoWorkspace)
  const responseData = parseServiceResponseData(res.data)
  return normalizeWorkspace(seatsIoWorkspaceSchema.parse(responseData))
}

export async function fetchSeatsIoSeatingLayouts(pageNo = 1, pageSize = 20): Promise<SeatsIoSeatingLayoutsPage> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoSeatingLayouts, {
    params: { pageNo, pageSize },
  })
  const responseData = parseServiceResponseData(res.data)
  const parsed = seatsIoSeatingLayoutsPageSchema.parse(responseData)
  const pageData = (parsed.PageData ?? parsed.pageData ?? []).map(normalizeSeatingLayout)

  return {
    items: pageData,
    total: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? pageData.length,
    page: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    totalPages: parsed.PageCount ?? parsed.pageCount ?? 0,
  }
}

export async function fetchSeatsIoSeatingLayoutDetail(chartUniqueId: string): Promise<SeatsIoSeatingLayoutDetail> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoSeatingLayout(chartUniqueId))
  const responseData = parseServiceResponseData(res.data)
  return normalizeSeatingLayoutDetail(seatsIoSeatingLayoutDetailSchema.parse(responseData))
}

export async function fetchSeatsIoChartValidation(chartKey: string): Promise<SeatsIoChartValidation> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoChartValidation(chartKey))
  const responseData = parseServiceResponseData(res.data)
  return normalizeChartValidation(seatsIoChartValidationSchema.parse(responseData))
}

export async function saveSeatsIoSeatingLayout(payload: SeatsIoSeatingLayoutRequest): Promise<SeatsIoSeatingLayout> {
  const body: Record<string, unknown> = {
    name: payload.name,
    seatsIoChartKey: payload.seatsIoChartKey,
  }

  if (payload.venueUniqueId) {
    body.venueUniqueId = payload.venueUniqueId
  }

  const res = await client.post<unknown>(API_ROUTES.seatsIoSeatingLayouts, body)
  const responseData = parseServiceResponseData(res.data)
  return normalizeSeatingLayout(seatsIoSeatingLayoutSchema.parse(responseData))
}

export async function fetchSeatsIoChartCategories(chartUniqueId: string): Promise<SeatsIoChartCategory[]> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoChartCategories(chartUniqueId))
  const responseData = parseServiceResponseData(res.data)
  return normalizeChartCategoryList(responseData)
}

export async function fetchSeatsIoVenueCharts(venueUniqueId: string): Promise<SeatsIoSeatingLayout[]> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoVenueCharts(venueUniqueId))
  const responseData = parseServiceResponseData(res.data)

  if (!Array.isArray(responseData)) {
    return []
  }

  return responseData.map((item) => normalizeSeatingLayout(seatsIoSeatingLayoutSchema.parse(item)))
}

export async function fetchSeatsIoChartEvents(chartUniqueId: string): Promise<SeatsIoChartEvent[]> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoChartEvents(chartUniqueId))
  const responseData = parseServiceResponseData(res.data)

  if (!Array.isArray(responseData)) {
    return []
  }

  return responseData.map((item) => normalizeChartEvent(seatsIoEventSchema.parse(item)))
}

export async function createSeatsIoChartCategory(
  chartUniqueId: string,
  payload: SeatsIoChartCategoryRequest
): Promise<SeatsIoChartCategory> {
  const res = await client.post<unknown>(API_ROUTES.seatsIoChartCategories(chartUniqueId), payload)
  const responseData = parseServiceResponseData(res.data)
  return normalizeChartCategory(seatsIoChartCategorySchema.parse(responseData))
}

export async function updateSeatsIoChartCategory(
  chartUniqueId: string,
  categoryUniqueId: string,
  payload: SeatsIoChartCategoryRequest
): Promise<SeatsIoChartCategory> {
  const res = await client.put<unknown>(API_ROUTES.seatsIoChartCategory(chartUniqueId, categoryUniqueId), payload)
  const responseData = parseServiceResponseData(res.data)
  return normalizeChartCategory(seatsIoChartCategorySchema.parse(responseData))
}

export async function deleteSeatsIoChartCategory(chartUniqueId: string, categoryUniqueId: string): Promise<void> {
  const res = await client.delete<unknown>(API_ROUTES.seatsIoChartCategory(chartUniqueId, categoryUniqueId))

  // A 200 whose envelope reports failure would otherwise read as a deletion that never happened; a delete
  // answered with no body at all carries no such claim and stays a success.
  if (res.data && typeof res.data === "object") {
    assertSuccess(res.data, "Failed to delete the category.")
  }
}

export async function createSessionSeatsIoEvent(
  sessionId: string,
  payload: { chartUniqueId: string; label: string },
): Promise<SeatsIoChartEvent> {
  const res = await client.post<unknown>(API_ROUTES.sessionSeatsIoEvent(sessionId), payload)
  const responseData = parseServiceResponseData(res.data)
  return normalizeChartEvent(seatsIoEventSchema.parse(responseData))
}

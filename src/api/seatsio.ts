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
  ThumbnailUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  PreviewUrl: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
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

const seatsIoChartCategoryCapacitySchema = z.object({
  CategoryId: z.number().int().optional(),
  categoryId: z.number().int().optional(),
  CategoryUniqueId: z.string().nullable().optional(),
  categoryUniqueId: z.string().nullable().optional(),
  Key: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  Name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  ObjectCount: z.number().int().nullable().optional(),
  objectCount: z.number().int().nullable().optional(),
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
  /** Preview image Seats.io renders for the published chart; null when the chart has no published version. */
  thumbnailUrl: string | null
  /** Public Seats.io page showing the chart; null until the chart exists in Seats.io. */
  previewUrl: string | null
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

export interface SeatsIoChartCategoryCapacity {
  categoryId: number
  categoryUniqueId: string
  key: string
  name: string
  /**
   * How many tickets the category can carry on the published layout: a seat or a table booked as a whole counts as
   * one, a standing area counts as its capacity. Zero means nothing is drawn against it. Null means it holds a
   * standing area of unlimited capacity and so has no exact size.
   */
  objectCount: number | null
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
    thumbnailUrl: item.ThumbnailUrl ?? item.thumbnailUrl ?? null,
    previewUrl: item.PreviewUrl ?? item.previewUrl ?? null,
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

function normalizeChartCategoryCapacity(
  item: z.infer<typeof seatsIoChartCategoryCapacitySchema>,
): SeatsIoChartCategoryCapacity {
  return {
    categoryId: item.CategoryId ?? item.categoryId ?? 0,
    categoryUniqueId: item.CategoryUniqueId ?? item.categoryUniqueId ?? "",
    key: item.Key ?? item.key ?? "",
    name: item.Name ?? item.name ?? "",
    objectCount: item.ObjectCount ?? item.objectCount ?? null,
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

export async function refreshSeatsIoSeatingLayoutThumbnail(chartUniqueId: string): Promise<SeatsIoSeatingLayoutDetail> {
  const res = await client.post<unknown>(API_ROUTES.seatsIoSeatingLayoutThumbnail(chartUniqueId))
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

export async function fetchSeatsIoChartCategoryCapacity(
  chartUniqueId: string,
): Promise<SeatsIoChartCategoryCapacity[]> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoChartCategoryCapacity(chartUniqueId))
  const responseData = parseServiceResponseData(res.data)

  if (!Array.isArray(responseData)) {
    return []
  }

  return responseData.map((item) =>
    normalizeChartCategoryCapacity(seatsIoChartCategoryCapacitySchema.parse(item)),
  )
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

const reportGroupSchema = z.object({
  Key: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  Label: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  Count: z.number().int().nullable().optional(),
  count: z.number().int().nullable().optional(),
})

const eventSummaryReportSchema = z.object({
  TotalObjects: z.number().int().nullable().optional(),
  totalObjects: z.number().int().nullable().optional(),
  UnavailableObjects: z.number().int().nullable().optional(),
  unavailableObjects: z.number().int().nullable().optional(),
  AvailableObjects: z.number().int().nullable().optional(),
  availableObjects: z.number().int().nullable().optional(),
  ByStatus: z.array(reportGroupSchema).nullable().optional(),
  byStatus: z.array(reportGroupSchema).nullable().optional(),
  ByCategory: z.array(reportGroupSchema).nullable().optional(),
  byCategory: z.array(reportGroupSchema).nullable().optional(),
})

const eventTableBookingSchema = z.object({
  Label: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  BookingType: z.string().nullable().optional(),
  bookingType: z.string().nullable().optional(),
})

const eventTableBookingReportSchema = z.object({
  Mode: z.string().nullable().optional(),
  mode: z.string().nullable().optional(),
  ModeLabel: z.string().nullable().optional(),
  modeLabel: z.string().nullable().optional(),
  InheritsChartSettings: z.boolean().nullable().optional(),
  inheritsChartSettings: z.boolean().nullable().optional(),
  Tables: z.array(eventTableBookingSchema).nullable().optional(),
  tables: z.array(eventTableBookingSchema).nullable().optional(),
})

const eventChannelSchema = z.object({
  Key: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  Name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  Color: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  ObjectCount: z.number().int().nullable().optional(),
  objectCount: z.number().int().nullable().optional(),
})

const eventCategorySchema = z.object({
  Key: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  Label: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  Color: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  Count: z.number().int().nullable().optional(),
  count: z.number().int().nullable().optional(),
})

const eventForSaleReportSchema = z.object({
  EverythingForSale: z.boolean().nullable().optional(),
  everythingForSale: z.boolean().nullable().optional(),
  ForSale: z.boolean().nullable().optional(),
  forSale: z.boolean().nullable().optional(),
  Objects: z.array(z.string()).nullable().optional(),
  objects: z.array(z.string()).nullable().optional(),
  Categories: z.array(z.string()).nullable().optional(),
  categories: z.array(z.string()).nullable().optional(),
  AreaPlaces: z.array(reportGroupSchema).nullable().optional(),
  areaPlaces: z.array(reportGroupSchema).nullable().optional(),
})

const eventStatusChangeSchema = z.object({
  ObjectLabel: z.string().nullable().optional(),
  objectLabel: z.string().nullable().optional(),
  Status: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  Quantity: z.number().int().nullable().optional(),
  quantity: z.number().int().nullable().optional(),
  HoldToken: z.string().nullable().optional(),
  holdToken: z.string().nullable().optional(),
  OrderId: z.string().nullable().optional(),
  orderId: z.string().nullable().optional(),
  Origin: z.string().nullable().optional(),
  origin: z.string().nullable().optional(),
  DateUtc: z.string().nullable().optional(),
  dateUtc: z.string().nullable().optional(),
})

const eventStatusChangePageSchema = z.object({
  Items: z.array(eventStatusChangeSchema).nullable().optional(),
  items: z.array(eventStatusChangeSchema).nullable().optional(),
  NextPageStartsAfter: z.number().int().nullable().optional(),
  nextPageStartsAfter: z.number().int().nullable().optional(),
})

const eventRenderContextSchema = z.object({
  EventKey: z.string().nullable().optional(),
  eventKey: z.string().nullable().optional(),
  PublicKey: z.string().nullable().optional(),
  publicKey: z.string().nullable().optional(),
  Region: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  EventLabel: z.string().nullable().optional(),
  eventLabel: z.string().nullable().optional(),
  ChartName: z.string().nullable().optional(),
  chartName: z.string().nullable().optional(),
  ChartUniqueId: z.string().nullable().optional(),
  chartUniqueId: z.string().nullable().optional(),
  VenueName: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  VenueMapUrl: z.string().nullable().optional(),
  venueMapUrl: z.string().nullable().optional(),
  SessionName: z.string().nullable().optional(),
  sessionName: z.string().nullable().optional(),
  SessionUniqueId: z.string().nullable().optional(),
  sessionUniqueId: z.string().nullable().optional(),
  SessionStartUtc: z.string().nullable().optional(),
  sessionStartUtc: z.string().nullable().optional(),
  SessionStatus: z.string().nullable().optional(),
  sessionStatus: z.string().nullable().optional(),
})

export interface SeatsIoReportGroup {
  key: string
  label: string
  count: number
}

export interface SeatsIoEventSummaryReport {
  totalObjects: number
  unavailableObjects: number
  availableObjects: number
  byStatus: SeatsIoReportGroup[]
  byCategory: SeatsIoReportGroup[]
}

export interface SeatsIoEventTableBooking {
  label: string
  bookingType: string
}

export interface SeatsIoEventTableBookingReport {
  mode: string
  modeLabel: string
  inheritsChartSettings: boolean
  tables: SeatsIoEventTableBooking[]
}

export interface SeatsIoEventChannel {
  key: string
  name: string
  color: string
  objectCount: number
}

export interface SeatsIoEventCategory {
  key: string
  label: string
  color: string
  count: number
}

export interface SeatsIoEventForSaleReport {
  everythingForSale: boolean
  forSale: boolean
  objects: string[]
  categories: string[]
  areaPlaces: SeatsIoReportGroup[]
}

export interface SeatsIoEventStatusChange {
  objectLabel: string
  status: string
  quantity: number
  holdToken: string
  orderId: string
  origin: string
  dateUtc: string | null
}

export interface SeatsIoEventStatusChangePage {
  items: SeatsIoEventStatusChange[]
  nextPageStartsAfter: number | null
}

export interface SeatsIoEventRenderContext {
  eventKey: string
  publicKey: string
  region: string
  eventLabel: string
  chartName: string
  /** Identifier of the chart, used to link its name to the seating layout; empty when unseated. */
  chartUniqueId: string
  venueName: string
  /** External map URL of the venue, opened in a new tab; empty when none is set. */
  venueMapUrl: string
  sessionName: string
  /** Identifier of the bound session, used to link its name to the session wizard; empty when unbound. */
  sessionUniqueId: string
  /** ISO-8601 UTC start of the bound session, or empty when none is bound or none is set. */
  sessionStartUtc: string
  /** Lowercase lifecycle token of the bound session (e.g. "published"), or empty when none is bound. */
  sessionStatus: string
}

function normalizeReportGroup(item: z.infer<typeof reportGroupSchema>): SeatsIoReportGroup {
  return {
    key: item.Key ?? item.key ?? "",
    label: item.Label ?? item.label ?? "",
    count: item.Count ?? item.count ?? 0,
  }
}

function normalizeReportGroupList(list: z.infer<typeof reportGroupSchema>[] | null | undefined): SeatsIoReportGroup[] {
  return (list ?? []).map(normalizeReportGroup)
}

function normalizeEventSummary(item: z.infer<typeof eventSummaryReportSchema>): SeatsIoEventSummaryReport {
  return {
    totalObjects: item.TotalObjects ?? item.totalObjects ?? 0,
    unavailableObjects: item.UnavailableObjects ?? item.unavailableObjects ?? 0,
    availableObjects: item.AvailableObjects ?? item.availableObjects ?? 0,
    byStatus: normalizeReportGroupList(item.ByStatus ?? item.byStatus),
    byCategory: normalizeReportGroupList(item.ByCategory ?? item.byCategory),
  }
}

function normalizeTableBookingReport(
  item: z.infer<typeof eventTableBookingReportSchema>,
): SeatsIoEventTableBookingReport {
  const tables = (item.Tables ?? item.tables ?? []).map((table) => ({
    label: table.Label ?? table.label ?? "",
    bookingType: table.BookingType ?? table.bookingType ?? "",
  }))

  return {
    mode: item.Mode ?? item.mode ?? "",
    modeLabel: item.ModeLabel ?? item.modeLabel ?? "",
    inheritsChartSettings: item.InheritsChartSettings ?? item.inheritsChartSettings ?? false,
    tables,
  }
}

function normalizeChannel(item: z.infer<typeof eventChannelSchema>): SeatsIoEventChannel {
  return {
    key: item.Key ?? item.key ?? "",
    name: item.Name ?? item.name ?? "",
    color: item.Color ?? item.color ?? "",
    objectCount: item.ObjectCount ?? item.objectCount ?? 0,
  }
}

function normalizeEventCategory(item: z.infer<typeof eventCategorySchema>): SeatsIoEventCategory {
  return {
    key: item.Key ?? item.key ?? "",
    label: item.Label ?? item.label ?? "",
    color: item.Color ?? item.color ?? "",
    count: item.Count ?? item.count ?? 0,
  }
}

function normalizeForSale(item: z.infer<typeof eventForSaleReportSchema>): SeatsIoEventForSaleReport {
  return {
    everythingForSale: item.EverythingForSale ?? item.everythingForSale ?? false,
    forSale: item.ForSale ?? item.forSale ?? false,
    objects: item.Objects ?? item.objects ?? [],
    categories: item.Categories ?? item.categories ?? [],
    areaPlaces: normalizeReportGroupList(item.AreaPlaces ?? item.areaPlaces),
  }
}

function normalizeStatusChange(item: z.infer<typeof eventStatusChangeSchema>): SeatsIoEventStatusChange {
  return {
    objectLabel: item.ObjectLabel ?? item.objectLabel ?? "",
    status: item.Status ?? item.status ?? "",
    quantity: item.Quantity ?? item.quantity ?? 0,
    holdToken: item.HoldToken ?? item.holdToken ?? "",
    orderId: item.OrderId ?? item.orderId ?? "",
    origin: item.Origin ?? item.origin ?? "",
    dateUtc: item.DateUtc ?? item.dateUtc ?? null,
  }
}

function normalizeRenderContext(item: z.infer<typeof eventRenderContextSchema>): SeatsIoEventRenderContext {
  return {
    eventKey: item.EventKey ?? item.eventKey ?? "",
    publicKey: item.PublicKey ?? item.publicKey ?? "",
    region: item.Region ?? item.region ?? "",
    eventLabel: item.EventLabel ?? item.eventLabel ?? "",
    chartName: item.ChartName ?? item.chartName ?? "",
    chartUniqueId: item.ChartUniqueId ?? item.chartUniqueId ?? "",
    venueName: item.VenueName ?? item.venueName ?? "",
    venueMapUrl: item.VenueMapUrl ?? item.venueMapUrl ?? "",
    sessionName: item.SessionName ?? item.sessionName ?? "",
    sessionUniqueId: item.SessionUniqueId ?? item.sessionUniqueId ?? "",
    sessionStartUtc: item.SessionStartUtc ?? item.sessionStartUtc ?? "",
    sessionStatus: item.SessionStatus ?? item.sessionStatus ?? "",
  }
}

export async function fetchSeatsIoEventSummary(eventUniqueId: string): Promise<SeatsIoEventSummaryReport> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoEventReportSummary(eventUniqueId))
  const responseData = parseServiceResponseData(res.data)
  return normalizeEventSummary(eventSummaryReportSchema.parse(responseData ?? {}))
}

export async function fetchSeatsIoEventRenderContext(eventUniqueId: string): Promise<SeatsIoEventRenderContext> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoEventRenderContext(eventUniqueId))
  const responseData = parseServiceResponseData(res.data)
  return normalizeRenderContext(eventRenderContextSchema.parse(responseData ?? {}))
}

export async function fetchSeatsIoEventForSale(eventUniqueId: string): Promise<SeatsIoEventForSaleReport> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoEventReportForSale(eventUniqueId))
  const responseData = parseServiceResponseData(res.data)
  return normalizeForSale(eventForSaleReportSchema.parse(responseData ?? {}))
}

export async function fetchSeatsIoEventTables(eventUniqueId: string): Promise<SeatsIoEventTableBookingReport> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoEventReportTables(eventUniqueId))
  const responseData = parseServiceResponseData(res.data)
  return normalizeTableBookingReport(eventTableBookingReportSchema.parse(responseData ?? {}))
}

export async function fetchSeatsIoEventChannels(eventUniqueId: string): Promise<SeatsIoEventChannel[]> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoEventReportChannels(eventUniqueId))
  const responseData = parseServiceResponseData(res.data)

  if (!Array.isArray(responseData)) {
    return []
  }

  return responseData.map((item) => normalizeChannel(eventChannelSchema.parse(item)))
}

export async function fetchSeatsIoEventCategories(eventUniqueId: string): Promise<SeatsIoEventCategory[]> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoEventReportCategories(eventUniqueId))
  const responseData = parseServiceResponseData(res.data)

  if (!Array.isArray(responseData)) {
    return []
  }

  return responseData.map((item) => normalizeEventCategory(eventCategorySchema.parse(item)))
}

export async function fetchSeatsIoEventStatusChanges(
  eventUniqueId: string,
  startAfterId?: number | null,
): Promise<SeatsIoEventStatusChangePage> {
  const res = await client.get<unknown>(API_ROUTES.seatsIoEventReportStatusChanges(eventUniqueId), {
    params: startAfterId ? { startAfterId } : undefined,
  })
  const responseData = parseServiceResponseData(res.data)
  const parsed = eventStatusChangePageSchema.parse(responseData ?? {})

  return {
    items: (parsed.Items ?? parsed.items ?? []).map(normalizeStatusChange),
    nextPageStartsAfter: parsed.NextPageStartsAfter ?? parsed.nextPageStartsAfter ?? null,
  }
}

export interface SeatsIoForSaleSelection {
  objects: string[]
  categories: string[]
}

export async function markSeatsIoEventForSale(
  eventUniqueId: string,
  selection: SeatsIoForSaleSelection,
): Promise<void> {
  const res = await client.post<unknown>(API_ROUTES.seatsIoEventMarkForSale(eventUniqueId), selection)

  if (res.data && typeof res.data === "object") {
    assertSuccess(res.data, "Failed to mark the selection as for sale.")
  }
}

export async function markSeatsIoEventNotForSale(
  eventUniqueId: string,
  selection: SeatsIoForSaleSelection,
): Promise<void> {
  const res = await client.post<unknown>(API_ROUTES.seatsIoEventMarkNotForSale(eventUniqueId), selection)

  if (res.data && typeof res.data === "object") {
    assertSuccess(res.data, "Failed to mark the selection as not for sale.")
  }
}

export async function markSeatsIoEventEverythingForSale(eventUniqueId: string): Promise<void> {
  const res = await client.post<unknown>(API_ROUTES.seatsIoEventMarkEverythingForSale(eventUniqueId))

  if (res.data && typeof res.data === "object") {
    assertSuccess(res.data, "Failed to put everything back on sale.")
  }
}

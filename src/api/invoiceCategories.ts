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

export type InvoiceCategorySortBy = "name" | "displayOrder" | "createdOnUtc"
export type InvoiceCategorySortOrder = "asc" | "desc"

// Serialization casing is not guaranteed across endpoints, so every field is accepted in both forms
// and collapsed in the normalizer below - the same approach as api/documentCategories.ts.
const dual = <T extends z.ZodTypeAny>(schema: T) => schema.optional()
const integer = () => z.coerce.number().int()

const invoiceCategorySchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  IsActive: dual(z.boolean()),
  isActive: dual(z.boolean()),
  DisplayOrder: dual(integer()),
  displayOrder: dual(integer()),
  CreatedOnUtc: dual(z.string()),
  createdOnUtc: dual(z.string()),
})

const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    PageNo: dual(integer()),
    pageNo: dual(integer()),
    PageSize: dual(integer()),
    pageSize: dual(integer()),
    PageCount: dual(integer()),
    pageCount: dual(integer()),
    TotalRecordsCount: dual(integer()),
    totalRecordsCount: dual(integer()),
    PageData: z.array(item).optional(),
    pageData: z.array(item).optional(),
  })

export interface InvoiceCategoryListItem {
  uniqueId: string
  name: string
  isActive: boolean
  displayOrder: number
  createdOnUtc: string
}

export interface InvoiceCategoryFilters {
  searchTerm: string
  sortBy: InvoiceCategorySortBy
  sortOrder: InvoiceCategorySortOrder
}

/** Shared by create and (from plan 03) update. */
export interface SaveInvoiceCategoryPayload {
  name: string
  isActive: boolean
  displayOrder: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function readResponseData(response: { Data?: unknown; data?: unknown }): unknown {
  return response.Data ?? response.data ?? null
}

function parseServicePayload(payload: unknown): unknown {
  const response = serviceResponseSchema.parse(payload) as
    | ServiceResponse<unknown>
    | { Data?: unknown; data?: unknown }
  return readResponseData(response)
}

function assertSuccess(payload: unknown, fallbackMessage: string): void {
  const response = serviceResponseSchema.parse(payload)
  if (response.success === false) {
    throw new Error(response.message ?? fallbackMessage)
  }
}

function normalizeInvoiceCategory(
  raw: z.infer<typeof invoiceCategorySchema>,
): InvoiceCategoryListItem {
  return {
    uniqueId: raw.UniqueId ?? raw.uniqueId ?? "",
    name: raw.Name ?? raw.name ?? "",
    isActive: raw.IsActive ?? raw.isActive ?? true,
    displayOrder: raw.DisplayOrder ?? raw.displayOrder ?? 0,
    createdOnUtc: raw.CreatedOnUtc ?? raw.createdOnUtc ?? "",
  }
}

function toPage(
  parsed: z.infer<ReturnType<typeof pageSchema>>,
  pageNo: number,
  pageSize: number,
): Page<InvoiceCategoryListItem> {
  const rawItems = (parsed.PageData ?? parsed.pageData ?? []) as z.infer<
    typeof invoiceCategorySchema
  >[]
  const items = rawItems.map(normalizeInvoiceCategory)
  return {
    items,
    total: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? items.length,
    page: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    totalPages: parsed.PageCount ?? parsed.pageCount ?? 0,
  }
}

export async function fetchInvoiceCategories(
  filters: InvoiceCategoryFilters,
  pageNo: number,
  pageSize: number,
): Promise<Page<InvoiceCategoryListItem>> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))
  params.set("sortBy", filters.sortBy)
  params.set("sortOrder", filters.sortOrder)
  if (filters.searchTerm.trim()) {
    params.set("searchTerm", filters.searchTerm.trim())
  }

  const response = await client.get<unknown>(API_ROUTES.invoiceCategories, { params })
  const parsed = pageSchema(invoiceCategorySchema).parse(parseServicePayload(response.data))
  return toPage(parsed, pageNo, pageSize)
}

export async function createInvoiceCategory(
  payload: SaveInvoiceCategoryPayload,
): Promise<string> {
  const response = await client.post<unknown>(API_ROUTES.invoiceCategoryCreate, payload)
  assertSuccess(response.data, "Failed to create category.")
  const data = parseServicePayload(response.data)
  return typeof data === "string" ? data : ""
}

export async function updateInvoiceCategory(
  uniqueId: string,
  payload: SaveInvoiceCategoryPayload,
): Promise<void> {
  const response = await client.put<unknown>(API_ROUTES.invoiceCategoryDetail(uniqueId), payload)
  assertSuccess(response.data, "Failed to update category.")
}

export async function deleteInvoiceCategory(uniqueId: string): Promise<void> {
  const response = await client.delete<unknown>(API_ROUTES.invoiceCategoryDetail(uniqueId))
  assertSuccess(response.data, "Failed to delete category.")
}

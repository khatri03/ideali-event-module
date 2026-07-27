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

export type DocumentCategorySortBy = "name" | "documentCount" | "createdOnUtc"
export type DocumentCategorySortOrder = "asc" | "desc"

// Serialization casing is not guaranteed across endpoints, so every field is accepted in both forms and
// collapsed in the normalizers below - same approach as api/alerts.ts.
const dual = <T extends z.ZodTypeAny>(schema: T) => schema.optional()
const integer = () => z.coerce.number().int()

const documentFileSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  FileName: dual(z.string()),
  fileName: dual(z.string()),
  ContentType: dual(z.string()),
  contentType: dual(z.string()),
  FileSize: dual(integer()),
  fileSize: dual(integer()),
  Description: dual(z.string().nullable()),
  description: dual(z.string().nullable()),
  UploadedOnUtc: dual(z.string()),
  uploadedOnUtc: dual(z.string()),
})

const documentCategorySchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  Description: dual(z.string().nullable()),
  description: dual(z.string().nullable()),
  DocumentCount: dual(integer()),
  documentCount: dual(integer()),
  AllowDownload: dual(z.boolean()),
  allowDownload: dual(z.boolean()),
  MembershipTypeNames: dual(z.array(z.string())),
  membershipTypeNames: dual(z.array(z.string())),
  CreatedOnUtc: dual(z.string()),
  createdOnUtc: dual(z.string()),
})

const documentCategoryDetailSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  Description: dual(z.string().nullable()),
  description: dual(z.string().nullable()),
  AllowDownload: dual(z.boolean()),
  allowDownload: dual(z.boolean()),
  MembershipTypeUniqueIds: dual(z.array(z.string())),
  membershipTypeUniqueIds: dual(z.array(z.string())),
  Documents: z.array(documentFileSchema).nullable().optional(),
  documents: z.array(documentFileSchema).nullable().optional(),
  CreatedOnUtc: dual(z.string()),
  createdOnUtc: dual(z.string()),
})

const memberDocumentCategorySchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  Description: dual(z.string().nullable()),
  description: dual(z.string().nullable()),
  DocumentCount: dual(integer()),
  documentCount: dual(integer()),
})

const memberDocumentCategoryDetailSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  Description: dual(z.string().nullable()),
  description: dual(z.string().nullable()),
  AllowDownload: dual(z.boolean()),
  allowDownload: dual(z.boolean()),
})

const membershipTypeOptionSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  ActiveMemberCount: dual(integer()),
  activeMemberCount: dual(integer()),
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

export interface DocumentCategoryListItem {
  uniqueId: string
  name: string
  description: string | null
  documentCount: number
  /** False means members may open the documents but not download them. */
  allowDownload: boolean
  /** Empty means the category is visible to every member of the organizer. */
  membershipTypeNames: string[]
  createdOnUtc: string
}

export interface DocumentFile {
  /** Identifies the document within its category, not the stored file - this is what download takes. */
  uniqueId: string
  fileName: string
  contentType: string
  fileSize: number
  description: string | null
  uploadedOnUtc: string
}

export interface DocumentCategoryDetail {
  uniqueId: string
  name: string
  description: string | null
  allowDownload: boolean
  membershipTypeUniqueIds: string[]
  documents: DocumentFile[]
  createdOnUtc: string
}

export interface MemberDocumentCategory {
  uniqueId: string
  name: string
  description: string | null
  documentCount: number
}

export interface MemberDocumentCategoryDetail {
  uniqueId: string
  name: string
  description: string | null
  allowDownload: boolean
}

export interface DocumentCategoryMembershipTypeOption {
  uniqueId: string
  name: string
  activeMemberCount: number
}

export interface DocumentCategoryFilters {
  searchTerm: string
  sortBy: DocumentCategorySortBy
  sortOrder: DocumentCategorySortOrder
}

export interface SaveDocumentCategoryPayload {
  name: string
  description: string | null
  allowDownload: boolean
  membershipTypeUniqueIds: string[]
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

function normalizeDocumentFile(raw: z.infer<typeof documentFileSchema>): DocumentFile {
  return {
    uniqueId: raw.UniqueId ?? raw.uniqueId ?? "",
    fileName: raw.FileName ?? raw.fileName ?? "",
    contentType: raw.ContentType ?? raw.contentType ?? "",
    fileSize: raw.FileSize ?? raw.fileSize ?? 0,
    description: raw.Description ?? raw.description ?? null,
    uploadedOnUtc: raw.UploadedOnUtc ?? raw.uploadedOnUtc ?? "",
  }
}

function normalizeDocumentCategory(
  raw: z.infer<typeof documentCategorySchema>,
): DocumentCategoryListItem {
  return {
    uniqueId: raw.UniqueId ?? raw.uniqueId ?? "",
    name: raw.Name ?? raw.name ?? "",
    description: raw.Description ?? raw.description ?? null,
    documentCount: raw.DocumentCount ?? raw.documentCount ?? 0,
    allowDownload: raw.AllowDownload ?? raw.allowDownload ?? true,
    membershipTypeNames: raw.MembershipTypeNames ?? raw.membershipTypeNames ?? [],
    createdOnUtc: raw.CreatedOnUtc ?? raw.createdOnUtc ?? "",
  }
}

function toPage<S, T>(
  parsed: z.infer<ReturnType<typeof pageSchema>>,
  normalize: (item: S) => T,
  pageNo: number,
  pageSize: number,
): Page<T> {
  const rawItems = (parsed.PageData ?? parsed.pageData ?? []) as S[]
  const items = rawItems.map(normalize)
  return {
    items,
    total: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? items.length,
    page: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    totalPages: parsed.PageCount ?? parsed.pageCount ?? 0,
  }
}

export async function fetchDocumentCategories(
  filters: DocumentCategoryFilters,
  pageNo: number,
  pageSize: number,
): Promise<Page<DocumentCategoryListItem>> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))
  params.set("sortBy", filters.sortBy)
  params.set("sortOrder", filters.sortOrder)
  if (filters.searchTerm.trim()) {
    params.set("searchTerm", filters.searchTerm.trim())
  }

  const response = await client.get<unknown>(API_ROUTES.documentCategories, { params })
  const parsed = pageSchema(documentCategorySchema).parse(parseServicePayload(response.data))
  return toPage(parsed, normalizeDocumentCategory, pageNo, pageSize)
}

export async function fetchDocumentCategory(uniqueId: string): Promise<DocumentCategoryDetail> {
  const response = await client.get<unknown>(API_ROUTES.documentCategoryDetail(uniqueId))
  const raw = documentCategoryDetailSchema.parse(parseServicePayload(response.data))

  return {
    uniqueId: raw.UniqueId ?? raw.uniqueId ?? "",
    name: raw.Name ?? raw.name ?? "",
    description: raw.Description ?? raw.description ?? null,
    allowDownload: raw.AllowDownload ?? raw.allowDownload ?? true,
    membershipTypeUniqueIds: raw.MembershipTypeUniqueIds ?? raw.membershipTypeUniqueIds ?? [],
    documents: (raw.Documents ?? raw.documents ?? []).map(normalizeDocumentFile),
    createdOnUtc: raw.CreatedOnUtc ?? raw.createdOnUtc ?? "",
  }
}

export async function fetchDocumentCategoryMembershipTypeOptions(): Promise<
  DocumentCategoryMembershipTypeOption[]
> {
  const response = await client.get<unknown>(API_ROUTES.documentCategoryMembershipTypeOptions)
  const parsed = z.array(membershipTypeOptionSchema).parse(parseServicePayload(response.data) ?? [])

  return parsed.map((raw) => ({
    uniqueId: raw.UniqueId ?? raw.uniqueId ?? "",
    name: raw.Name ?? raw.name ?? "",
    activeMemberCount: raw.ActiveMemberCount ?? raw.activeMemberCount ?? 0,
  }))
}

export async function createDocumentCategory(payload: SaveDocumentCategoryPayload): Promise<string> {
  const response = await client.post<unknown>(API_ROUTES.documentCategoryCreate, payload)
  assertSuccess(response.data, "Failed to create document category.")
  const data = parseServicePayload(response.data)
  return typeof data === "string" ? data : ""
}

export async function updateDocumentCategory(
  uniqueId: string,
  payload: SaveDocumentCategoryPayload,
): Promise<void> {
  const response = await client.put<unknown>(API_ROUTES.documentCategoryDetail(uniqueId), payload)
  assertSuccess(response.data, "Failed to update document category.")
}

export async function deleteDocumentCategory(uniqueId: string): Promise<void> {
  const response = await client.delete<unknown>(API_ROUTES.documentCategoryDetail(uniqueId))
  assertSuccess(response.data, "Failed to delete document category.")
}

export async function uploadDocuments(uniqueId: string, files: File[]): Promise<void> {
  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))

  const response = await client.post<unknown>(API_ROUTES.documentCategoryDocuments(uniqueId), formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  assertSuccess(response.data, "Failed to upload documents.")
}

export async function removeDocuments(uniqueId: string, documentUniqueIds: string[]): Promise<void> {
  // The endpoint is a DELETE with a body, so the payload goes under `data` rather than as the second arg.
  const response = await client.delete<unknown>(API_ROUTES.documentCategoryDocuments(uniqueId), {
    data: { documentUniqueIds },
  })
  assertSuccess(response.data, "Failed to remove documents.")
}

/**
 * Pulls the file through the axios client rather than pointing an anchor at the URL: the API is on a
 * different origin and the endpoint is authenticated, so a plain link would not carry credentials.
 */
async function downloadBlob(url: string, fileName: string): Promise<void> {
  const response = await client.get<Blob>(url, { responseType: "blob" })
  const objectUrl = URL.createObjectURL(response.data)

  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Revoking synchronously can cancel the download before the browser has read the blob.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}

export function downloadDocument(documentUniqueId: string, fileName: string): Promise<void> {
  return downloadBlob(API_ROUTES.documentCategoryDocumentDownload(documentUniqueId), fileName)
}

export async function fetchMemberDocumentCategories(
  searchTerm: string,
  pageNo: number,
  pageSize: number,
): Promise<Page<MemberDocumentCategory>> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))
  if (searchTerm.trim()) {
    params.set("searchTerm", searchTerm.trim())
  }

  const response = await client.get<unknown>(API_ROUTES.memberDocumentCategories, { params })
  const parsed = pageSchema(memberDocumentCategorySchema).parse(parseServicePayload(response.data))

  return toPage(
    parsed,
    (raw: z.infer<typeof memberDocumentCategorySchema>) => ({
      uniqueId: raw.UniqueId ?? raw.uniqueId ?? "",
      name: raw.Name ?? raw.name ?? "",
      description: raw.Description ?? raw.description ?? null,
      documentCount: raw.DocumentCount ?? raw.documentCount ?? 0,
    }),
    pageNo,
    pageSize,
  )
}

export async function fetchMemberDocumentCategory(
  uniqueId: string,
): Promise<MemberDocumentCategoryDetail> {
  const response = await client.get<unknown>(API_ROUTES.memberDocumentCategoryDetail(uniqueId))
  const raw = memberDocumentCategoryDetailSchema.parse(parseServicePayload(response.data))

  return {
    uniqueId: raw.UniqueId ?? raw.uniqueId ?? "",
    name: raw.Name ?? raw.name ?? "",
    description: raw.Description ?? raw.description ?? null,
    allowDownload: raw.AllowDownload ?? raw.allowDownload ?? true,
  }
}

export async function fetchMemberDocuments(
  uniqueId: string,
  pageNo: number,
  pageSize: number,
): Promise<Page<DocumentFile>> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))

  const response = await client.get<unknown>(API_ROUTES.memberDocumentCategoryDocuments(uniqueId), { params })
  const parsed = pageSchema(documentFileSchema).parse(parseServicePayload(response.data))
  return toPage(parsed, normalizeDocumentFile, pageNo, pageSize)
}

export function downloadMemberDocument(documentUniqueId: string, fileName: string): Promise<void> {
  return downloadBlob(API_ROUTES.memberDocumentDownload(documentUniqueId), fileName)
}

/** Thrown when the browser refused the new tab, so the caller can say that rather than "request failed". */
export class PopupBlockedError extends Error {
  constructor() {
    super("Your browser blocked the document window. Allow pop-ups for this site, then try again.")
    this.name = "PopupBlockedError"
  }
}

/**
 * Opens the document inline in a new tab.
 *
 * Two constraints fight here. The tab must be opened synchronously, before the request, because a
 * window.open issued after an await is treated as an unrequested popup and blocked. But `noopener` must
 * NOT be passed: with it, window.open returns null by specification, leaving no handle to navigate - the
 * blob would load and go nowhere. The opened document is our own same-origin blob, so the retained
 * opener reference is not the cross-origin hazard `noopener` exists to prevent.
 */
export async function viewMemberDocument(documentUniqueId: string): Promise<void> {
  const tab = window.open("", "_blank")
  if (!tab) {
    throw new PopupBlockedError()
  }

  try {
    const response = await client.get<Blob>(API_ROUTES.memberDocumentView(documentUniqueId), {
      responseType: "blob",
    })
    const objectUrl = URL.createObjectURL(response.data)
    tab.location.href = objectUrl

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (error) {
    // Leaving a blank tab open would strand the member on about:blank with no explanation.
    tab.close()
    throw error
  }
}

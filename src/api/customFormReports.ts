import type { AxiosError } from "axios"
import { z } from "zod"
import { client } from "@/api/client"
import { assertSuccess, parseServicePayload, ServiceResponseError } from "@/api/serviceResponse"
import type { PaginatedResponse } from "@/api/types"
import { API_ROUTES } from "@/utils/routes"

const moduleOptionSchema = z.object({
  text: z.string(),
  value: z.number().int(),
})

const guidOptionSchema = z.object({
  text: z.string(),
  value: z.string(),
})

const reportFieldSchema = z.object({
  uniqueId: z.string(),
  label: z.string(),
  controlType: z.string(),
  displayOrder: z.number().int(),
  /** Set only where a report template renames the column. */
  columnLabel: z.string().nullish().transform((label) => label ?? null),
})

const reportColumnsSchema = z.object({
  formUniqueId: z.string(),
  formName: z.string(),
  maxColumns: z.number().int().positive(),
  fields: z.array(reportFieldSchema),
})

const reportRowSchema = z.object({
  invoiceNo: z.string().nullable(),
  contactName: z.string().nullable(),
  contactNo: z.string().nullable(),
  contactEmail: z.string().nullable(),
  entityName: z.string().nullable(),
  answers: z.record(z.string(), z.string().nullable()),
})

function pageSchema<TItem extends z.ZodTypeAny>(itemSchema: TItem) {
  return z.object({
    pageNo: z.number().int(),
    pageSize: z.number().int(),
    pageCount: z.number().int(),
    totalRecordsCount: z.number().int(),
    pageData: z.array(itemSchema).nullable(),
  })
}

const reportResultSchema = z.object({
  columns: z.array(reportFieldSchema),
  rows: pageSchema(reportRowSchema),
})

const templateListItemSchema = z.object({
  uniqueId: z.string(),
  name: z.string(),
  moduleName: z.string(),
  columnCount: z.number().int(),
})

const templateDetailSchema = z.object({
  uniqueId: z.string(),
  name: z.string(),
  moduleId: z.number().int(),
  moduleName: z.string(),
  formUniqueId: z.string(),
  formName: z.string(),
  columns: z.array(reportFieldSchema),
})

export interface ReportModuleOption {
  id: number
  name: string
}

export interface ReportOption {
  uniqueId: string
  name: string
}

export interface ReportField {
  uniqueId: string
  label: string
  controlType: string
  displayOrder: number
  columnLabel: string | null
}

export interface ReportColumns {
  formUniqueId: string
  formName: string
  maxColumns: number
  fields: ReportField[]
}

export interface ReportRow {
  invoiceNo: string
  contactName: string
  contactNo: string
  contactEmail: string
  entityName: string
  answers: Record<string, string | null>
}

export interface ReportResult {
  columns: ReportField[]
  rows: PaginatedResponse<ReportRow>
}

/** Mirrors EnumCustomFormReportFilterOperator on the API — the server rejects anything outside it. */
export const REPORT_FILTER_OPERATOR = {
  contains: 1,
  equals: 2,
  notEquals: 3,
  isAnyOf: 4,
  isEmpty: 5,
  isNotEmpty: 6,
} as const

export type ReportFilterOperator = (typeof REPORT_FILTER_OPERATOR)[keyof typeof REPORT_FILTER_OPERATOR]

/** Mirrors EnumCustomFormReportSystemField on the API — the record details every report row carries. */
export const REPORT_SYSTEM_FIELD = {
  invoiceNo: 1,
  contactName: 2,
  contactNo: 3,
  contactEmail: 4,
  entityName: 5,
} as const

export type ReportSystemField = (typeof REPORT_SYSTEM_FIELD)[keyof typeof REPORT_SYSTEM_FIELD]

/** A filter names either a custom form field or a record detail, never both. */
export interface ReportFilter {
  fieldUniqueId: string | null
  systemField: ReportSystemField | null
  operator: ReportFilterOperator
  values: string[]
}

export interface ReportRequest {
  moduleId: number
  entityUniqueId: string
  formUniqueId: string
  fieldUniqueIds: string[]
  filters: ReportFilter[]
  /** Like a filter, the sort names either a selected column or a record detail, never both. */
  sortFieldUniqueId: string | null
  sortSystemField: ReportSystemField | null
  sortDescending: boolean
  pageNo: number
  pageSize: number
}

/** Mirrors EnumCustomFormReportExportFormat on the API. */
export const REPORT_EXPORT_FORMAT = {
  csv: 1,
  excel: 2,
  json: 3,
} as const

export type ReportExportFormat = (typeof REPORT_EXPORT_FORMAT)[keyof typeof REPORT_EXPORT_FORMAT]

/** Mirrors EnumCustomFormReportExportScope on the API. */
export const REPORT_EXPORT_SCOPE = {
  currentPage: 1,
  allMatchingRows: 2,
} as const

export type ReportExportScope = (typeof REPORT_EXPORT_SCOPE)[keyof typeof REPORT_EXPORT_SCOPE]

export interface ReportExportRequest extends ReportRequest {
  format: ReportExportFormat
  scope: ReportExportScope
  /** Names the template whose renamed headings the file should carry. */
  templateUniqueId: string | null
}

export interface ReportDownload {
  blob: Blob
  fileName: string
}

export interface ReportTemplateListItem {
  uniqueId: string
  name: string
  moduleName: string
  columnCount: number
}

export interface ReportTemplateDetail {
  uniqueId: string
  name: string
  moduleId: number
  moduleName: string
  formUniqueId: string
  formName: string
  columns: ReportField[]
}

export interface ReportTemplateColumn {
  fieldUniqueId: string
  /** Null keeps the field's own control label as the heading. */
  columnLabel: string | null
}

export interface ReportTemplateRequest {
  name: string
  moduleId: number
  formUniqueId: string
  columns: ReportTemplateColumn[]
}

function toOption(item: z.infer<typeof guidOptionSchema>): ReportOption {
  return { uniqueId: item.value, name: item.text }
}

export async function fetchReportModules(): Promise<ReportModuleOption[]> {
  const response = await client.get<unknown>(API_ROUTES.customFormReportModules)
  const parsed = z.array(moduleOptionSchema).parse(parseServicePayload(response.data))

  return parsed.map((item) => ({ id: item.value, name: item.text }))
}

export async function fetchReportEntities(moduleId: number): Promise<ReportOption[]> {
  const response = await client.get<unknown>(API_ROUTES.customFormReportEntities(moduleId))
  return z.array(guidOptionSchema).parse(parseServicePayload(response.data)).map(toOption)
}

export async function fetchReportForms(moduleId: number, entityUniqueId: string): Promise<ReportOption[]> {
  const response = await client.get<unknown>(API_ROUTES.customFormReportForms(moduleId, entityUniqueId))
  return z.array(guidOptionSchema).parse(parseServicePayload(response.data)).map(toOption)
}

export async function fetchReportColumns(formUniqueId: string): Promise<ReportColumns> {
  const response = await client.get<unknown>(API_ROUTES.customFormReportColumns(formUniqueId))
  return reportColumnsSchema.parse(parseServicePayload(response.data))
}

export async function runCustomFormReport(request: ReportRequest): Promise<ReportResult> {
  const response = await client.post<unknown>(API_ROUTES.customFormReportRun, request)
  assertSuccess(response.data, "Failed to run the report.")

  const parsed = reportResultSchema.parse(parseServicePayload(response.data))
  const rows = (parsed.rows.pageData ?? []).map((row) => ({
    invoiceNo: row.invoiceNo ?? "",
    contactName: row.contactName ?? "",
    contactNo: row.contactNo ?? "",
    contactEmail: row.contactEmail ?? "",
    entityName: row.entityName ?? "",
    answers: row.answers,
  }))

  return {
    columns: parsed.columns,
    rows: {
      items: rows,
      total: parsed.rows.totalRecordsCount,
      page: parsed.rows.pageNo,
      pageSize: parsed.rows.pageSize,
      totalPages: parsed.rows.pageCount,
    },
  }
}

const DEFAULT_EXPORT_FILE_NAME = "custom-form-report"
const CONTENT_DISPOSITION_FILE_NAME = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i

/**
 * The download is asked for as a blob, so a rejection arrives as one too. It is read back as text and surfaced as
 * the same error a JSON endpoint would raise, rather than reaching the reader as an unreadable file.
 */
async function readServiceFailure(payload: unknown): Promise<never> {
  const fallback = "Failed to download the report."

  if (!(payload instanceof Blob)) {
    throw new ServiceResponseError(fallback)
  }

  try {
    assertSuccess(JSON.parse(await payload.text()), fallback)
  } catch (error) {
    throw error instanceof ServiceResponseError ? error : new ServiceResponseError(fallback)
  }

  throw new ServiceResponseError(fallback)
}

function fileNameFrom(contentDisposition: unknown): string {
  if (typeof contentDisposition !== "string") {
    return DEFAULT_EXPORT_FILE_NAME
  }

  const matched = CONTENT_DISPOSITION_FILE_NAME.exec(contentDisposition)

  return matched ? decodeURIComponent(matched[1]) : DEFAULT_EXPORT_FILE_NAME
}

export async function exportCustomFormReport(request: ReportExportRequest): Promise<ReportDownload> {
  const response = await client
    .post<Blob>(API_ROUTES.customFormReportExport, request, { responseType: "blob" })
    .catch((error: AxiosError) => readServiceFailure(error.response?.data))

  return {
    blob: response.data,
    fileName: fileNameFrom(response.headers["content-disposition"]),
  }
}

export async function fetchReportTemplates(
  searchTerm: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<ReportTemplateListItem>> {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("pageSize", String(pageSize))

  if (searchTerm.trim()) {
    params.set("searchTerm", searchTerm.trim())
  }

  const response = await client.get<unknown>(API_ROUTES.customFormReportTemplates, { params })
  const parsed = pageSchema(templateListItemSchema).parse(parseServicePayload(response.data))

  return {
    items: parsed.pageData ?? [],
    total: parsed.totalRecordsCount,
    page: parsed.pageNo,
    pageSize: parsed.pageSize,
    totalPages: parsed.pageCount,
  }
}

export async function fetchReportTemplateOptions(moduleId: number, formUniqueId: string): Promise<ReportOption[]> {
  const response = await client.get<unknown>(API_ROUTES.customFormReportTemplateOptions(moduleId, formUniqueId))
  return z.array(guidOptionSchema).parse(parseServicePayload(response.data)).map(toOption)
}

export async function fetchReportTemplate(templateUniqueId: string): Promise<ReportTemplateDetail> {
  const response = await client.get<unknown>(API_ROUTES.customFormReportTemplate(templateUniqueId))
  return templateDetailSchema.parse(parseServicePayload(response.data))
}

export async function createReportTemplate(request: ReportTemplateRequest): Promise<string> {
  const response = await client.post<unknown>(API_ROUTES.customFormReportTemplates, request)
  assertSuccess(response.data, "Failed to save the report template.")

  return z.string().parse(parseServicePayload(response.data))
}

export async function updateReportTemplate(
  templateUniqueId: string,
  request: ReportTemplateRequest,
): Promise<string> {
  const response = await client.put<unknown>(API_ROUTES.customFormReportTemplate(templateUniqueId), request)
  assertSuccess(response.data, "Failed to update the report template.")

  return z.string().parse(parseServicePayload(response.data))
}

export async function deleteReportTemplate(templateUniqueId: string): Promise<void> {
  const response = await client.delete<unknown>(API_ROUTES.customFormReportTemplate(templateUniqueId))
  assertSuccess(response.data, "Failed to delete the report template.")
}

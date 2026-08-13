import { z } from "zod"
import { client } from "@/api/client"
import { assertSuccess, parseServicePayload } from "@/api/serviceResponse"
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

export interface ReportFilter {
  fieldUniqueId: string
  operator: ReportFilterOperator
  values: string[]
}

export interface ReportRequest {
  moduleId: number
  entityUniqueId: string
  formUniqueId: string
  fieldUniqueIds: string[]
  filters: ReportFilter[]
  pageNo: number
  pageSize: number
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

export interface ReportTemplateRequest {
  name: string
  moduleId: number
  formUniqueId: string
  fieldUniqueIds: string[]
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

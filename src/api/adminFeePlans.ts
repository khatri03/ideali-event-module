import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"
import type { ServiceResponse } from "@/api/types"
import type { PaginatedResponse } from "@/api/types"

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

const paginatedResponseSchema = z.object({
  PageNo: z.number().int().optional(),
  pageNo: z.number().int().optional(),
  PageSize: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  PageCount: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  TotalRecordsCount: z.number().int().optional(),
  totalRecordsCount: z.number().int().optional(),
  PageData: z.array(z.unknown()).optional(),
  pageData: z.array(z.unknown()).optional(),
})

const adminFeePlanRuleSchema = z.object({
  Target: z.enum(["Organizer", "Buyer"]).optional(),
  target: z.enum(["Organizer", "Buyer"]).optional(),
  ValueType: z.enum(["Fixed", "Percent"]).optional(),
  valueType: z.enum(["Fixed", "Percent"]).optional(),
  Value: z.number().optional(),
  value: z.number().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

const adminRevenuePlanScopeSchema = z.enum(["OrganizerSpecific", "Reusable", "Default"])

const adminFeePlanSchema = z.object({
  Id: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  OrganizerUniqueId: z.string().nullable().optional(),
  organizerUniqueId: z.string().nullable().optional(),
  OrganizerName: z.string().nullable().optional(),
  organizerName: z.string().nullable().optional(),
  ModuleId: z.number().int().nonnegative().optional(),
  moduleId: z.number().int().nonnegative().optional(),
  ModuleName: z.string().optional(),
  moduleName: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  Label: z.string().optional(),
  label: z.string().optional(),
  Scope: adminRevenuePlanScopeSchema.optional(),
  scope: adminRevenuePlanScopeSchema.optional(),
  IsDefault: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  SourceType: z.string().optional(),
  sourceType: z.string().optional(),
  ModuleIds: z.array(z.number().int().positive()).optional(),
  moduleIds: z.array(z.number().int().positive()).optional(),
  ModuleNames: z.array(z.string()).optional(),
  moduleNames: z.array(z.string()).optional(),
  AssignedOrganizerCount: z.number().int().optional(),
  assignedOrganizerCount: z.number().int().optional(),
  OrganizerCount: z.number().int().optional(),
  organizerCount: z.number().int().optional(),
  MappedOrganizerCount: z.number().int().optional(),
  mappedOrganizerCount: z.number().int().optional(),
  AssignedOrganizerUniqueIds: z.array(z.string()).optional(),
  assignedOrganizerUniqueIds: z.array(z.string()).optional(),
  TopOrganizerNames: z.array(z.string()).optional(),
  topOrganizerNames: z.array(z.string()).optional(),
  TopOrganizerUniqueIds: z.array(z.string()).optional(),
  topOrganizerUniqueIds: z.array(z.string()).optional(),
  Rules: z.array(adminFeePlanRuleSchema).optional(),
  rules: z.array(adminFeePlanRuleSchema).optional(),
})

const adminFeePlanPageSchema = z.object({
  PageNo: z.number().int().optional(),
  pageNo: z.number().int().optional(),
  PageSize: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  PageCount: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  TotalRecordsCount: z.number().int().optional(),
  totalRecordsCount: z.number().int().optional(),
  PageData: z.array(adminFeePlanSchema).optional(),
  pageData: z.array(adminFeePlanSchema).optional(),
})

const moduleOptionSchema = z.object({
  Text: z.string().optional(),
  text: z.string().optional(),
  Value: z.number().int().positive().optional(),
  value: z.number().int().positive().optional(),
})

const organizerListItemSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
})

const adminFeePlanRuleInputSchema = z.object({
  target: z.enum(["Organizer", "Buyer"]),
  valueType: z.enum(["Fixed", "Percent"]),
  value: z.coerce.number().nonnegative(),
  isActive: z.boolean(),
}).superRefine((rule, ctx) => {
  if (!rule.isActive) {
    return
  }

  if (rule.value <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Value must be greater than zero.",
    })
  }

  if (rule.valueType === "Percent" && rule.value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Percentage value cannot exceed 100.",
    })
  }
})

const adminRevenuePlanInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  moduleId: z.coerce.number().int().positive(),
  scope: adminRevenuePlanScopeSchema,
  organizerUniqueId: z.string().uuid().optional().nullable(),
  isActive: z.boolean(),
  organizerUniqueIds: z.array(z.string()).default([]),
  rules: z.array(adminFeePlanRuleInputSchema).min(1),
})

const adminRevenuePlanMetadataInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  scope: adminRevenuePlanScopeSchema,
  organizerUniqueId: z.string().uuid().optional().nullable(),
  isActive: z.boolean(),
})

const adminRevenuePlanModuleInputSchema = z.object({
  moduleId: z.coerce.number().int().positive(),
  isEdit: z.boolean(),
  rules: z.array(adminFeePlanRuleInputSchema).min(1),
})

const adminRevenuePlanAssignOrganizersInputSchema = z.object({
  organizerUniqueIds: z.array(z.string()).min(1),
})

export type AdminRevenuePlanRuleInput = z.infer<typeof adminFeePlanRuleInputSchema>
export type AdminRevenuePlanInput = z.infer<typeof adminRevenuePlanInputSchema>
export type AdminRevenuePlanMetadataInput = z.infer<typeof adminRevenuePlanMetadataInputSchema>
export type AdminRevenuePlanModuleInput = z.infer<typeof adminRevenuePlanModuleInputSchema>
export type AdminRevenuePlanAssignOrganizersInput = z.infer<typeof adminRevenuePlanAssignOrganizersInputSchema>
export type AdminRevenuePlanScope = z.infer<typeof adminRevenuePlanScopeSchema>

export interface AdminRevenuePlanRule {
  target: "Organizer" | "Buyer"
  valueType: "Fixed" | "Percent"
  value: number
  isActive: boolean
}

export interface AdminRevenuePlan {
  id: number
  uniqueId: string
  organizerUniqueId?: string | null
  organizerName?: string | null
  moduleId: number
  moduleName: string
  moduleIds: number[]
  moduleNames: string[]
  name: string
  label: string
  scope: "OrganizerSpecific" | "Reusable" | "Default"
  isDefault: boolean
  isActive: boolean
  sourceType: string
  assignedOrganizerCount: number
  organizerCount: number
  topOrganizerNames: string[]
  topOrganizerUniqueIds: string[]
  assignedOrganizerUniqueIds: string[]
  rules: AdminRevenuePlanRule[]
}

const adminRevenuePlanTopOrganizerNamesSchema = z.array(z.string())

const adminRevenuePlanOrganizerNamesSchema = z.array(
  z.object({
    UniqueId: z.string().optional(),
    uniqueId: z.string().optional(),
    Name: z.string().optional(),
    name: z.string().optional(),
  }),
)

export interface AdminRevenuePlanModuleOption {
  value: number
  text: string
}

export interface AdminOrganizerOption {
  value: string
  text: string
}

export interface AdminRevenuePlanOrganizer {
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
  const response = serviceResponseSchema.parse(payload) as ServiceResponse<unknown> | { Data?: unknown; data?: unknown }
  return readResponseData(response)
}

function assertSuccess(payload: unknown, fallbackMessage: string): void {
  const response = serviceResponseSchema.parse(payload)
  if (response.success === false) {
    throw new Error(response.message ?? fallbackMessage)
  }
}

function normalizeRule(rule: z.infer<typeof adminFeePlanRuleSchema>): AdminRevenuePlanRule {
  return {
    target: rule.Target ?? rule.target ?? "Organizer",
    valueType: rule.ValueType ?? rule.valueType ?? "Percent",
    value: rule.Value ?? rule.value ?? 0,
    isActive: rule.IsActive ?? rule.isActive ?? false,
  }
}

function normalizePlan(plan: z.infer<typeof adminFeePlanSchema>): AdminRevenuePlan {
  const moduleIds = plan.ModuleIds ?? plan.moduleIds ?? (plan.ModuleId ?? plan.moduleId ? [plan.ModuleId ?? plan.moduleId ?? 0] : [])
  const moduleNames = plan.ModuleNames ?? plan.moduleNames ?? (plan.ModuleName ?? plan.moduleName ? [plan.ModuleName ?? plan.moduleName ?? ""] : [])

  return {
    id: plan.Id ?? plan.id ?? 0,
    uniqueId: plan.UniqueId ?? plan.uniqueId ?? "",
    organizerUniqueId: plan.OrganizerUniqueId ?? plan.organizerUniqueId ?? null,
    organizerName: plan.OrganizerName ?? plan.organizerName ?? null,
    moduleId: moduleIds[0] ?? plan.ModuleId ?? plan.moduleId ?? 0,
    moduleName: moduleNames[0] ?? plan.ModuleName ?? plan.moduleName ?? "",
    moduleIds,
    moduleNames,
    name: plan.Name ?? plan.name ?? "",
    label: plan.Label ?? plan.label ?? "",
    scope: plan.Scope ?? plan.scope ?? "Reusable",
    isDefault: plan.IsDefault ?? plan.isDefault ?? false,
    isActive: plan.IsActive ?? plan.isActive ?? false,
    sourceType: plan.SourceType ?? plan.sourceType ?? (plan.Scope ?? plan.scope ?? "Reusable"),
    assignedOrganizerCount:
      plan.AssignedOrganizerCount ??
      plan.assignedOrganizerCount ??
      plan.OrganizerCount ??
      plan.organizerCount ??
      plan.MappedOrganizerCount ??
      plan.mappedOrganizerCount ??
      0,
    organizerCount:
      plan.OrganizerCount ??
      plan.organizerCount ??
      plan.AssignedOrganizerCount ??
      plan.assignedOrganizerCount ??
      plan.MappedOrganizerCount ??
      plan.mappedOrganizerCount ??
      0,
    topOrganizerNames: adminRevenuePlanTopOrganizerNamesSchema.parse(plan.TopOrganizerNames ?? plan.topOrganizerNames ?? []),
    topOrganizerUniqueIds: plan.TopOrganizerUniqueIds ?? plan.topOrganizerUniqueIds ?? [],
    assignedOrganizerUniqueIds: plan.AssignedOrganizerUniqueIds ?? plan.assignedOrganizerUniqueIds ?? [],
    rules: (plan.Rules ?? plan.rules ?? []).map(normalizeRule),
  }
}

export async function fetchAdminRevenuePlans(pageNo = 1, pageSize = 6): Promise<PaginatedResponse<AdminRevenuePlan>> {
  const response = await client.get<unknown>(API_ROUTES.adminRevenuePlans, {
    params: { pageNo, pageSize },
  })
  const data = parseServicePayload(response.data)
  const parsed = adminFeePlanPageSchema.parse(data)
  const items = (parsed.PageData ?? parsed.pageData ?? []).map(normalizePlan)

  return {
    items,
    total: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? items.length,
    page: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    totalPages: parsed.PageCount ?? parsed.pageCount ?? 0,
  }
}

export async function fetchAdminRevenuePlan(uniqueId: string, moduleId?: number): Promise<AdminRevenuePlan> {
  const response = await client.get<unknown>(API_ROUTES.adminRevenuePlanDetail(uniqueId), {
    params: moduleId ? { moduleId } : undefined,
  })
  const data = parseServicePayload(response.data)
  return normalizePlan(adminFeePlanSchema.parse(data))
}

export async function fetchAdminRevenuePlanOrganizerNames(uniqueId: string): Promise<AdminRevenuePlanOrganizer[]> {
  const response = await client.get<unknown>(API_ROUTES.adminRevenuePlanOrganizers(uniqueId))
  const data = parseServicePayload(response.data)
  return adminRevenuePlanOrganizerNamesSchema.parse(data).map((item) => ({
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
  }))
}

export async function fetchAdminRevenuePlanModules(): Promise<AdminRevenuePlanModuleOption[]> {
  const response = await client.get<unknown>(API_ROUTES.adminRevenuePlanModules)
  const data = parseServicePayload(response.data)

  return z
    .array(moduleOptionSchema)
    .parse(data)
    .map((item) => ({
      value: item.Value ?? item.value ?? 0,
      text: item.Text ?? item.text ?? "",
    }))
}

export async function fetchAdminRevenuePlanOrganizers(): Promise<AdminOrganizerOption[]> {
  const response = await client.get<unknown>(API_ROUTES.adminOrganizersList, {
    params: { pageIndex: 1, pageSize: 500, searchTerm: "" },
  })
  const data = parseServicePayload(response.data)
  const parsed = paginatedResponseSchema.parse(data)
  const items = parsed.PageData ?? parsed.pageData ?? []

  return z
    .array(organizerListItemSchema)
    .parse(items)
    .map((item) => ({
      value: item.UniqueId ?? item.uniqueId ?? "",
      text: item.Name ?? item.name ?? "",
    }))
    .filter((item) => item.value.length > 0)
}

export async function createAdminRevenuePlan(input: AdminRevenuePlanInput): Promise<void> {
  const payload = adminRevenuePlanInputSchema.parse(input)
  const response = await client.post<unknown>(API_ROUTES.adminRevenuePlanCreate, payload)
  assertSuccess(response.data, "Failed to save admin revenue plan.")
}

export async function updateAdminRevenuePlan(uniqueId: string, input: AdminRevenuePlanInput): Promise<void> {
  const payload = adminRevenuePlanInputSchema.parse(input)
  const response = await client.post<unknown>(API_ROUTES.adminRevenuePlanUpdate(uniqueId), payload)
  assertSuccess(response.data, "Failed to update admin revenue plan.")
}

export async function updateAdminRevenuePlanMetadata(uniqueId: string, input: AdminRevenuePlanMetadataInput): Promise<void> {
  const payload = adminRevenuePlanMetadataInputSchema.parse(input)
  const response = await client.post<unknown>(API_ROUTES.adminRevenuePlanMetadataUpdate(uniqueId), payload)
  assertSuccess(response.data, "Failed to update admin revenue plan.")
}

export async function saveAdminRevenuePlanModule(uniqueId: string, input: AdminRevenuePlanModuleInput): Promise<void> {
  const payload = adminRevenuePlanModuleInputSchema.parse(input)
  const response = await client.post<unknown>(API_ROUTES.adminRevenuePlanModuleSave(uniqueId), payload)
  assertSuccess(response.data, "Failed to save admin revenue plan module.")
}

export async function assignAdminRevenuePlanOrganizers(uniqueId: string, input: AdminRevenuePlanAssignOrganizersInput): Promise<void> {
  const payload = adminRevenuePlanAssignOrganizersInputSchema.parse(input)
  const response = await client.post<unknown>(API_ROUTES.adminRevenuePlanAssignOrganizers(uniqueId), payload)
  assertSuccess(response.data, "Failed to assign admin revenue plan to organizers.")
}

export async function unmapAdminRevenuePlanOrganizer(uniqueId: string, organizerUniqueId: string): Promise<void> {
  const response = await client.post<unknown>(API_ROUTES.adminRevenuePlanUnassignOrganizer(uniqueId, organizerUniqueId))
  assertSuccess(response.data, "Failed to unassign admin revenue plan from organizer.")
}

export async function unmapAdminRevenuePlanModule(uniqueId: string, moduleId: number): Promise<void> {
  const response = await client.delete<unknown>(API_ROUTES.adminRevenuePlanUnmapModule(uniqueId, moduleId))
  assertSuccess(response.data, "Failed to remove module from admin revenue plan.")
}

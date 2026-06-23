import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"
import type { ServiceResponse } from "@/api/types"

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

const adminFeePlanSchema = z.object({
  Id: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  ModuleId: z.number().int().positive().optional(),
  moduleId: z.number().int().positive().optional(),
  ModuleName: z.string().optional(),
  moduleName: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  Label: z.string().optional(),
  label: z.string().optional(),
  IsDefault: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  SourceType: z.string().optional(),
  sourceType: z.string().optional(),
  AssignedOrganizerCount: z.number().int().optional(),
  assignedOrganizerCount: z.number().int().optional(),
  MappedOrganizerCount: z.number().int().optional(),
  mappedOrganizerCount: z.number().int().optional(),
  Rules: z.array(adminFeePlanRuleSchema).optional(),
  rules: z.array(adminFeePlanRuleSchema).optional(),
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
  value: z.coerce.number().positive(),
  isActive: z.boolean(),
})

const adminRevenuePlanInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  moduleId: z.coerce.number().int().positive(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  rules: z.array(adminFeePlanRuleInputSchema).min(1),
})

export type AdminRevenuePlanRuleInput = z.infer<typeof adminFeePlanRuleInputSchema>
export type AdminRevenuePlanInput = z.infer<typeof adminRevenuePlanInputSchema>

export interface AdminRevenuePlanRule {
  target: "Organizer" | "Buyer"
  valueType: "Fixed" | "Percent"
  value: number
  isActive: boolean
}

export interface AdminRevenuePlan {
  id: number
  uniqueId: string
  moduleId: number
  moduleName: string
  name: string
  label: string
  isDefault: boolean
  isActive: boolean
  sourceType: string
  assignedOrganizerCount: number
  rules: AdminRevenuePlanRule[]
}

export interface AdminRevenuePlanModuleOption {
  value: number
  text: string
}

export interface AdminOrganizerOption {
  value: string
  text: string
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
    isActive: rule.IsActive ?? rule.isActive ?? true,
  }
}

function normalizePlan(plan: z.infer<typeof adminFeePlanSchema>): AdminRevenuePlan {
  return {
    id: plan.Id ?? plan.id ?? 0,
    uniqueId: plan.UniqueId ?? plan.uniqueId ?? "",
    moduleId: plan.ModuleId ?? plan.moduleId ?? 0,
    moduleName: plan.ModuleName ?? plan.moduleName ?? "",
    name: plan.Name ?? plan.name ?? "",
    label: plan.Label ?? plan.label ?? "",
    isDefault: plan.IsDefault ?? plan.isDefault ?? false,
    isActive: plan.IsActive ?? plan.isActive ?? false,
    sourceType: plan.SourceType ?? plan.sourceType ?? "Global",
    assignedOrganizerCount:
      plan.AssignedOrganizerCount ?? plan.assignedOrganizerCount ?? plan.MappedOrganizerCount ?? plan.mappedOrganizerCount ?? 0,
    rules: (plan.Rules ?? plan.rules ?? []).map(normalizeRule),
  }
}

export async function fetchAdminRevenuePlans(): Promise<AdminRevenuePlan[]> {
  const response = await client.get<unknown>(API_ROUTES.adminRevenuePlans)
  const data = parseServicePayload(response.data)

  return z.array(adminFeePlanSchema).parse(data).map(normalizePlan)
}

export async function fetchAdminRevenuePlan(uniqueId: string): Promise<AdminRevenuePlan> {
  const response = await client.get<unknown>(API_ROUTES.adminRevenuePlanDetail(uniqueId))
  const data = parseServicePayload(response.data)
  return normalizePlan(adminFeePlanSchema.parse(data))
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

export async function assignAdminRevenuePlanOrganizer(uniqueId: string, organizerUniqueId: string): Promise<void> {
  const response = await client.post<unknown>(API_ROUTES.adminRevenuePlanAssignOrganizer(uniqueId, organizerUniqueId))
  assertSuccess(response.data, "Failed to assign admin revenue plan to organizer.")
}

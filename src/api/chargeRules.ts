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

const chargeRuleSchema = z.object({
  Id: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  OrganizerId: z.number().int().positive().optional(),
  organizerId: z.number().int().positive().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  Label: z.string().optional(),
  label: z.string().optional(),
  ChargeKind: z.enum(["PaymentMethod", "RevenuePlan", "Tax", "Other"]).optional(),
  chargeKind: z.enum(["PaymentMethod", "RevenuePlan", "Tax", "Other"]).optional(),
  CalculationType: z.enum(["Fixed", "Percent"]).optional(),
  calculationType: z.enum(["Fixed", "Percent"]).optional(),
  Value: z.number().optional(),
  value: z.number().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  DisplayOrder: z.number().int().optional(),
  displayOrder: z.number().int().optional(),
})

const chargeRulePageSchema = z
  .object({
    PageNo: z.number().int().optional(),
    pageNo: z.number().int().optional(),
    PageSize: z.number().int().optional(),
    pageSize: z.number().int().optional(),
    PageCount: z.number().int().optional(),
    pageCount: z.number().int().optional(),
    TotalRecordsCount: z.number().int().optional(),
    totalRecordsCount: z.number().int().optional(),
    PageData: z.array(chargeRuleSchema).optional(),
    pageData: z.array(chargeRuleSchema).optional(),
  })
  .passthrough()

const chargeRuleInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  chargeKind: z.enum(["PaymentMethod", "RevenuePlan", "Tax", "Other"]),
  calculationType: z.enum(["Fixed", "Percent"]),
  value: z.coerce.number().positive(),
  isActive: z.boolean(),
})

export type OrganizerChargeRuleInput = z.infer<typeof chargeRuleInputSchema>

export interface OrganizerChargeRuleListItem {
  id: number
  uniqueId: string
  organizerId: number
  name: string
  label: string
  chargeKind: "PaymentMethod" | "RevenuePlan" | "Tax" | "Other"
  calculationType: "Fixed" | "Percent"
  value: number
  isActive: boolean
  displayOrder: number
}

export interface OrganizerChargeRulePage {
  items: OrganizerChargeRuleListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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

function normalizeChargeRule(item: z.infer<typeof chargeRuleSchema>): OrganizerChargeRuleListItem {
  return {
    id: item.Id ?? item.id ?? 0,
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    organizerId: item.OrganizerId ?? item.organizerId ?? 0,
    name: item.Name ?? item.name ?? "",
    label: item.Label ?? item.label ?? "",
    chargeKind: item.ChargeKind ?? item.chargeKind ?? "Tax",
    calculationType: item.CalculationType ?? item.calculationType ?? "Fixed",
    value: item.Value ?? item.value ?? 0,
    isActive: item.IsActive ?? item.isActive ?? false,
    displayOrder: item.DisplayOrder ?? item.displayOrder ?? 1,
  }
}

function parseChargeRulePage(payload: unknown, requestedPage: number, requestedPageSize: number): OrganizerChargeRulePage {
  if (Array.isArray(payload)) {
    const items = z.array(chargeRuleSchema).parse(payload).map(normalizeChargeRule)

    return {
      items,
      total: items.length,
      page: requestedPage,
      pageSize: requestedPageSize,
      totalPages: items.length > 0 ? 1 : 0,
    }
  }

  const page = chargeRulePageSchema.parse(payload)
  const items = (page.PageData ?? page.pageData ?? []).map(normalizeChargeRule)

  return {
    items,
    total: page.TotalRecordsCount ?? page.totalRecordsCount ?? items.length,
    page: page.PageNo ?? page.pageNo ?? requestedPage,
    pageSize: page.PageSize ?? page.pageSize ?? requestedPageSize,
    totalPages: page.PageCount ?? page.pageCount ?? 0,
  }
}

export async function fetchOrganizerChargeRules(pageNo = 1, pageSize = 10): Promise<OrganizerChargeRulePage> {
  const response = await client.get<unknown>(API_ROUTES.organizerChargeRules, {
    params: { pageNo, pageSize },
  })
  const data = parseServicePayload(response.data)
  return parseChargeRulePage(data, pageNo, pageSize)
}

export async function createOrganizerChargeRule(input: OrganizerChargeRuleInput): Promise<void> {
  const payload = chargeRuleInputSchema.parse(input)
  const response = await client.post<unknown>(API_ROUTES.organizerChargeRuleCreate, payload)
  assertSuccess(response.data, "Failed to save charge rule.")
}

export async function updateOrganizerChargeRule(uniqueId: string, input: OrganizerChargeRuleInput): Promise<void> {
  const payload = chargeRuleInputSchema.parse(input)
  const response = await client.post<unknown>(API_ROUTES.organizerChargeRuleUpdate(uniqueId), payload)
  assertSuccess(response.data, "Failed to update charge rule.")
}

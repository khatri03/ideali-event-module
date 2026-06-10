import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"

export type DiscountCouponTypeValue = "FixedAmount" | "Percentage"

export interface DiscountCouponListItem {
  uniqueId: string
  code: string
  moduleType: string
  discountType: DiscountCouponTypeValue
  discountValue: number
  maxDiscountAmount: number | null
  totalCoupons: number | null
  usageCount: number
  isActive: boolean
}

export interface DiscountCouponBatchSaveItem {
  uniqueId?: string
  code: string
  discountType: DiscountCouponTypeValue
  discountValue: number
  maxDiscountAmount: number | null
  totalCoupons: number
  isActive: boolean
}

export interface DiscountCouponBatchSaveRequest {
  discountsEnabled: boolean
  coupons: DiscountCouponBatchSaveItem[]
  deletedCouponIds: string[]
}

export interface DiscountCouponsInfo {
  discountsEnabled: boolean
  coupons: DiscountCouponListItem[]
}

const eventDiscountCouponResponseSchema = z.object({
  discountsEnabled: z.boolean(),
})

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

const discountCouponSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Code: z.string().optional(),
  code: z.string().optional(),
  ModuleType: z.string().optional(),
  moduleType: z.string().optional(),
  DiscountType: z.enum(["FixedAmount", "Percentage"]).optional(),
  discountType: z.enum(["FixedAmount", "Percentage"]).optional(),
  DiscountValue: z.number().optional(),
  discountValue: z.number().optional(),
  MaxDiscountAmount: z.number().nullable().optional(),
  maxDiscountAmount: z.number().nullable().optional(),
  TotalCoupons: z.number().int().nullable().optional(),
  totalCoupons: z.number().int().nullable().optional(),
  UsageCount: z.number().int().optional(),
  usageCount: z.number().int().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

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
  const serviceResponse = serviceResponseSchema.parse(payload)
  return readResponseData(serviceResponse)
}

function readDiscountCouponList(responseData: unknown): DiscountCouponListItem[] {
  const items = Array.isArray(responseData)
    ? responseData
    : responseData && typeof responseData === "object"
      ? (() => {
          const record = responseData as Record<string, unknown>
          if (Array.isArray(record.PageData)) return record.PageData
          if (Array.isArray(record.pageData)) return record.pageData
          if (Array.isArray(record.Data)) return record.Data
          if (Array.isArray(record.data)) return record.data
          if (Array.isArray(record.items)) return record.items
          return []
        })()
      : []

  return items
    .map((item): DiscountCouponListItem => {
      const coupon = discountCouponSchema.parse(item)

      return {
        uniqueId: coupon.UniqueId ?? coupon.uniqueId ?? "",
        code: coupon.Code ?? coupon.code ?? "",
        moduleType: coupon.ModuleType ?? coupon.moduleType ?? "",
        discountType: coupon.DiscountType ?? coupon.discountType ?? "FixedAmount",
        discountValue: coupon.DiscountValue ?? coupon.discountValue ?? 0,
        maxDiscountAmount: coupon.MaxDiscountAmount ?? coupon.maxDiscountAmount ?? null,
        totalCoupons: coupon.TotalCoupons ?? coupon.totalCoupons ?? null,
        usageCount: coupon.UsageCount ?? coupon.usageCount ?? 0,
        isActive: coupon.IsActive ?? coupon.isActive ?? false,
      }
    })
    .filter((item) => item.uniqueId && item.code)
}

export async function fetchEventDiscountCouponsInfo(eventUniqueId: string): Promise<DiscountCouponsInfo> {
  const [discountStateResponse, couponsResponse] = await Promise.all([
    client.get<unknown>(API_ROUTES.eventWizardDiscountCoupon(eventUniqueId)),
    client.get<unknown>(
      `/api/organizer/discount/coupon/list?pageNo=1&pageSize=100&moduleType=Event&moduleEntityUniqueId=${eventUniqueId}`,
    ),
  ])

  const discountState = eventDiscountCouponResponseSchema.parse(discountStateResponse.data)
  const responseData = parseServicePayload(couponsResponse.data)
  const coupons = readDiscountCouponList(responseData)

  return {
    discountsEnabled: discountState.discountsEnabled,
    coupons,
  }
}

export async function saveEventDiscountCoupons(
  eventUniqueId: string,
  request: DiscountCouponBatchSaveRequest,
): Promise<void> {
  const payload = await client.post<unknown>("/api/organizer/discount/coupon/batch-save", {
    moduleType: "Event",
    moduleEntityUniqueId: eventUniqueId,
    discountsEnabled: request.discountsEnabled,
    coupons: request.coupons.map((coupon) => ({
      uniqueId: coupon.uniqueId,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      totalCoupons: coupon.totalCoupons,
      isActive: coupon.isActive,
    })),
    deletedCouponIds: request.deletedCouponIds,
  })

  const responseData = parseServicePayload(payload.data) as { success?: boolean; message?: string | null }
  if (responseData && typeof responseData === "object" && responseData.success === false) {
    throw new Error(responseData.message || "Unable to save discount coupons.")
  }
}

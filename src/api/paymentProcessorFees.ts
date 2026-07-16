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

const paymentMerchantOptionSchema = z.object({
  Id: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  Name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
})

const paymentMethodOptionSchema = z.object({
  Text: z.string().optional(),
  text: z.string().optional(),
  Value: z.number().int().positive().optional(),
  value: z.number().int().positive().optional(),
})

const paymentProcessorFeeSchema = z.object({
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
  PaymentMerchantId: z.number().int().positive().optional(),
  paymentMerchantId: z.number().int().positive().optional(),
  PaymentMerchantName: z.string().nullable().optional(),
  paymentMerchantName: z.string().nullable().optional(),
  PaymentProductId: z.number().int().positive().optional(),
  paymentProductId: z.number().int().positive().optional(),
  PaymentProductName: z.string().nullable().optional(),
  paymentProductName: z.string().nullable().optional(),
  ValueType: z.enum(["Fixed", "Percent"]).optional(),
  valueType: z.enum(["Fixed", "Percent"]).optional(),
  Value: z.number().optional(),
  value: z.number().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

const paymentProcessorFeeInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  paymentMerchantId: z.coerce.number().int().positive(),
  paymentProductId: z.coerce.number().int().positive(),
  valueType: z.enum(["Fixed", "Percent"]),
  value: z.coerce.number().positive(),
  isActive: z.boolean(),
})

export type PaymentProcessorFeeInput = z.infer<typeof paymentProcessorFeeInputSchema>

export interface PaymentMerchantOption {
  id: number
  name: string
}

export interface OrganizerPaymentMethodOption {
  value: number
  text: string
}

export interface OrganizerPaymentProcessorFee {
  id: number
  uniqueId: string
  organizerId: number
  name: string
  label: string
  paymentMerchantId: number
  paymentMerchantName: string
  paymentProductId: number
  paymentProductName: string
  valueType: "Fixed" | "Percent"
  value: number
  isActive: boolean
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

export async function fetchPaymentMerchantOptions(): Promise<PaymentMerchantOption[]> {
  const response = await client.get<unknown>(API_ROUTES.adminPaymentMerchants)
  const data = parseServicePayload(response.data)

  return z
    .array(paymentMerchantOptionSchema)
    .parse(data)
    .map((item) => ({
      id: item.Id ?? item.id ?? 0,
      name: item.Name ?? item.name ?? "",
    }))
}

export async function fetchOrganizerPaymentMerchantMethods(paymentMerchantId: number): Promise<OrganizerPaymentMethodOption[]> {
  if (!Number.isFinite(paymentMerchantId) || paymentMerchantId <= 0) {
    return []
  }

  const response = await client.get<unknown>(API_ROUTES.organizerPaymentMerchantMethods(paymentMerchantId))
  const data = parseServicePayload(response.data)

  return z
    .array(paymentMethodOptionSchema)
    .parse(data)
    .map((item) => ({
      value: item.Value ?? item.value ?? 0,
      text: item.Text ?? item.text ?? "",
    }))
}

export async function fetchOrganizerPaymentProcessorFees(): Promise<OrganizerPaymentProcessorFee[]> {
  const response = await client.get<unknown>(API_ROUTES.organizerPaymentProcessorFees)
  const data = parseServicePayload(response.data)

  return z
    .array(paymentProcessorFeeSchema)
    .parse(data)
    .map((item) => ({
      id: item.Id ?? item.id ?? 0,
      uniqueId: item.UniqueId ?? item.uniqueId ?? "",
      organizerId: item.OrganizerId ?? item.organizerId ?? 0,
      name: item.Name ?? item.name ?? "",
      label: item.Label ?? item.label ?? "",
      paymentMerchantId: item.PaymentMerchantId ?? item.paymentMerchantId ?? 0,
      paymentMerchantName: item.PaymentMerchantName ?? item.paymentMerchantName ?? "",
      paymentProductId: item.PaymentProductId ?? item.paymentProductId ?? 0,
      paymentProductName: item.PaymentProductName ?? item.paymentProductName ?? "",
      valueType: item.ValueType ?? item.valueType ?? "Percent",
      value: item.Value ?? item.value ?? 0,
      isActive: item.IsActive ?? item.isActive ?? false,
    }))
}

export async function createOrganizerPaymentProcessorFee(input: PaymentProcessorFeeInput): Promise<void> {
  const payload = paymentProcessorFeeInputSchema.parse(input)
  const response = await client.post<unknown>(API_ROUTES.organizerPaymentProcessorFeeCreate, payload)
  assertSuccess(response.data, "Failed to save payment processor fee.")
}

export async function updateOrganizerPaymentProcessorFee(uniqueId: string, input: PaymentProcessorFeeInput): Promise<void> {
  const payload = paymentProcessorFeeInputSchema.parse(input)
  const response = await client.post<unknown>(API_ROUTES.organizerPaymentProcessorFeeUpdate(uniqueId), payload)
  assertSuccess(response.data, "Failed to update payment processor fee.")
}

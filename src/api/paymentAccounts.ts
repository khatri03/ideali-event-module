import { z } from "zod"
import { client } from "@/api/client"
import type { ServiceResponse } from "@/api/types"

const organizerPaymentAccountSelectionItemSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  PaymentMerchant: z.string().optional(),
  paymentMerchant: z.string().optional(),
  PaymentCurrency: z.string().optional(),
  paymentCurrency: z.string().optional(),
  TapToPayEnabled: z.boolean().optional(),
  tapToPayEnabled: z.boolean().optional(),
})

const organizerPaymentMethodOptionSchema = z.object({
  Text: z.string().optional(),
  text: z.string().optional(),
  Value: z.number().int().positive().optional(),
  value: z.number().int().positive().optional(),
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

export interface OrganizerPaymentAccountSelectionItem {
  uniqueId: string
  name: string
  paymentMerchant: string
  paymentCurrency: string
  tapToPayEnabled: boolean
}

export interface OrganizerPaymentMethodOption {
  text: string
  value: number
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
  const serviceResponse = serviceResponseSchema.parse(payload) as ServiceResponse<unknown> | { Data?: unknown; data?: unknown }
  return readResponseData(serviceResponse)
}

export async function fetchOrganizerPaymentAccountSelectionItems(): Promise<OrganizerPaymentAccountSelectionItem[]> {
  const res = await client.get<unknown>("/api/organizer/payment-account/selection-items")
  const responseData = parseServicePayload(res.data)
  return z.array(organizerPaymentAccountSelectionItemSchema).parse(responseData).map((item) => ({
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
    paymentMerchant: item.PaymentMerchant ?? item.paymentMerchant ?? "",
    paymentCurrency: item.PaymentCurrency ?? item.paymentCurrency ?? "",
    tapToPayEnabled: item.TapToPayEnabled ?? item.tapToPayEnabled ?? false,
  }))
}

export async function fetchOrganizerPaymentMethods(paymentAccountUniqueId: string): Promise<OrganizerPaymentMethodOption[]> {
  if (!paymentAccountUniqueId.trim()) {
    return []
  }

  const res = await client.get<unknown>(`/api/organizer/payment-account/${paymentAccountUniqueId}/payment-methods`)
  const responseData = parseServicePayload(res.data)
  return z.array(organizerPaymentMethodOptionSchema).parse(responseData).map((item) => ({
    text: item.Text ?? item.text ?? "",
    value: item.Value ?? item.value ?? 0,
  }))
}

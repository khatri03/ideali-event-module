import { z } from "zod"
import { client } from "@/api/client"
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

const rateLimitSchema = z.object({
  PermitLimit: z.number().int().optional(),
  permitLimit: z.number().int().optional(),
  WindowSeconds: z.number().int().optional(),
  windowSeconds: z.number().int().optional(),
})

export interface RateLimitSettings {
  permitLimit: number
  windowSeconds: number
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
  const response = serviceResponseSchema.parse(payload) as { Data?: unknown; data?: unknown }
  return readResponseData(response)
}

function assertSuccess(payload: unknown, fallbackMessage: string): void {
  const response = serviceResponseSchema.parse(payload)
  if (response.success === false) {
    throw new Error(response.message ?? fallbackMessage)
  }
}

function pick(upper: number | undefined, lower: number | undefined, fallback: number): number {
  return upper ?? lower ?? fallback
}

export async function fetchRateLimitSettings(): Promise<RateLimitSettings> {
  const response = await client.get<unknown>(API_ROUTES.adminRateLimit)
  const item = rateLimitSchema.parse(parseServicePayload(response.data))
  return {
    permitLimit: pick(item.PermitLimit, item.permitLimit, 5),
    windowSeconds: pick(item.WindowSeconds, item.windowSeconds, 60),
  }
}

export async function updateRateLimitSettings(settings: RateLimitSettings): Promise<void> {
  const response = await client.put<unknown>(API_ROUTES.adminRateLimit, {
    permitLimit: settings.permitLimit,
    windowSeconds: settings.windowSeconds,
  })
  assertSuccess(response.data, "Failed to update rate limit settings.")
}

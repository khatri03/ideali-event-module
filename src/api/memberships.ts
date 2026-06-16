import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"

const serviceResponseSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().nullable().optional(),
    errorCode: z.string().nullable().optional(),
    validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
    meta: z.record(z.string(), z.unknown()).nullable().optional(),
    timestamp: z.string().optional(),
    Data: z.unknown().optional(),
    data: z.unknown().optional(),
  })
  .passthrough()

const membershipTypeOptionSchema = z.object({
  Value: z.string().optional(),
  value: z.string().optional(),
  Text: z.string().optional(),
  text: z.string().optional(),
})

export interface MembershipTypeOption {
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
  const serviceResponse = serviceResponseSchema.parse(payload)
  return readResponseData(serviceResponse)
}

export async function fetchMembershipTypeOptions(): Promise<MembershipTypeOption[]> {
  const res = await client.get<unknown>(API_ROUTES.membershipTypeOptions)
  const responseData = parseServicePayload(res.data)
  const options = z.array(membershipTypeOptionSchema).parse(responseData)

  return options
    .map((option) => ({
      value: option.Value ?? option.value ?? "",
      text: option.Text ?? option.text ?? "",
    }))
    .filter((option) => option.value && option.text)
}

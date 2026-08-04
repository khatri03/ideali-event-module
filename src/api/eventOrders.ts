import { z } from "zod"
import { client } from "@/api/client"
import { normalizeEventOrderStatus, type EventOrderStatus } from "@/features/events/schemas/eventOrder.schemas"
import { API_ROUTES } from "@/utils/routes"

const serviceResponseSchema = z.object({
  Success: z.boolean().optional(),
  success: z.boolean().optional(),
  Message: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  Data: z.unknown().nullable().optional(),
  data: z.unknown().nullable().optional(),
})

function readResponseData(payload: unknown): unknown {
  const parsed = serviceResponseSchema.parse(payload)
  return parsed.Data ?? parsed.data
}

export async function fetchEventOrderStatus(orderUniqueId: string): Promise<EventOrderStatus> {
  const res = await client.get<unknown>(API_ROUTES.eventOrderStatus(orderUniqueId))
  return normalizeEventOrderStatus(readResponseData(res.data))
}

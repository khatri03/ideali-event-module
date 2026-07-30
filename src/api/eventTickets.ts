import { z } from "zod"
import { client } from "@/api/client"
import { normalizeEventTicketView, type EventTicketView } from "@/features/events/schemas/eventTicket.schemas"
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

export async function fetchEventTicketView(ticketUniqueId: string): Promise<EventTicketView> {
  const res = await client.get<unknown>(API_ROUTES.eventTicketView(ticketUniqueId))
  return normalizeEventTicketView(readResponseData(res.data))
}

import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"
import { normalizeEventCart, type EventCart } from "@/features/events/schemas/eventCart.schemas"
import {
  normalizeEventSeatingMap,
  type EventSeatingMap,
  type HoldEventSeatRequest,
  type ReleaseEventSeatRequest,
} from "@/features/events/schemas/eventSeating.schemas"

const serviceResponseSchema = z.object({
  Data: z.unknown().nullable().optional(),
  data: z.unknown().nullable().optional(),
})

function readResponseData(payload: unknown): unknown {
  const parsed = serviceResponseSchema.parse(payload)
  return parsed.Data ?? parsed.data
}

/** Reads the seat map for one session of a cart, together with the token its seats are held under. */
export async function fetchEventSeating(cartUniqueId: string, sessionUniqueId: string): Promise<EventSeatingMap> {
  const res = await client.get<unknown>(API_ROUTES.eventCartSeating(cartUniqueId, sessionUniqueId))
  return normalizeEventSeatingMap(readResponseData(res.data))
}

/** Holds one seat for the cart, and answers with the basket the seat now sits in. */
export async function holdEventSeat(cartUniqueId: string, request: HoldEventSeatRequest): Promise<EventCart> {
  const res = await client.post<unknown>(API_ROUTES.eventCartSeats(cartUniqueId), request)
  return normalizeEventCart(readResponseData(res.data))
}

/** Gives one of the cart's seats back, and answers with the basket it left. */
export async function releaseEventSeat(cartUniqueId: string, request: ReleaseEventSeatRequest): Promise<EventCart> {
  const res = await client.post<unknown>(API_ROUTES.eventCartSeatRelease(cartUniqueId), request)
  return normalizeEventCart(readResponseData(res.data))
}

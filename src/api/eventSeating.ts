import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"
import { normalizeEventCart, type EventCart } from "@/features/events/schemas/eventCart.schemas"
import {
  normalizeEventSeatHoldToken,
  normalizeEventSeatingMap,
  type EventSeatHoldToken,
  type EventSeatingMap,
  type HoldEventSeatRequest,
  type ReleaseEventSeatRequest,
  type ReleaseSessionSeatsRequest,
} from "@/features/events/schemas/eventSeating.schemas"

const serviceResponseSchema = z.object({
  Data: z.unknown().nullable().optional(),
  data: z.unknown().nullable().optional(),
})

function readResponseData(payload: unknown): unknown {
  const parsed = serviceResponseSchema.parse(payload)
  return parsed.Data ?? parsed.data
}

/**
 * Reads the seat map for one session of a cart, together with the token its seats are held under.
 *
 * The token this browser already holds seats under is offered so a cart that has held nothing yet adopts it rather
 * than minting a second one. A chart drawn under a token different from the one the seats are held under at Seats.io
 * can no longer release them, so a removed seat springs back into the basket the instant it is taken out.
 */
export async function fetchEventSeating(
  cartUniqueId: string,
  sessionUniqueId: string,
  presentedHoldToken?: string | null,
): Promise<EventSeatingMap> {
  const res = await client.get<unknown>(API_ROUTES.eventCartSeating(cartUniqueId, sessionUniqueId), {
    params: presentedHoldToken ? { holdToken: presentedHoldToken } : undefined,
  })
  return normalizeEventSeatingMap(readResponseData(res.data))
}

/**
 * Reads a session's seat map before any cart exists.
 *
 * It carries no hold token, so the chart drawn from it is read-only: seats are claimed against a cart, and there
 * is none until the buyer has identified themselves further along the form.
 */
export async function fetchEventSessionSeating(
  eventUniqueId: string,
  sessionUniqueId: string,
): Promise<EventSeatingMap> {
  const res = await client.get<unknown>(API_ROUTES.eventRegistrationSessionSeating(eventUniqueId, sessionUniqueId))
  return normalizeEventSeatingMap(readResponseData(res.data))
}

/**
 * Gives the chart the token it holds seats under before a cart exists.
 *
 * The form asks for a name and email a step after it shows the seats, and a cart cannot open without them, so
 * without this the buyer could look at the chart but not pick on it. The cart takes the token over when it opens.
 *
 * A token this browser was already holding is presented so the server can hand it back rather than mint a second
 * one. Whether it still holds anything is settled with Seats.io, so the answer is a live token either way.
 */
export async function issueSessionHoldToken(
  eventUniqueId: string,
  sessionUniqueId: string,
  presentedHoldToken?: string | null,
): Promise<EventSeatHoldToken> {
  const res = await client.post<unknown>(
    API_ROUTES.eventRegistrationSessionHoldToken(eventUniqueId, sessionUniqueId),
    { holdToken: presentedHoldToken ?? null },
  )

  return normalizeEventSeatHoldToken(readResponseData(res.data))
}

/**
 * Puts seats back on sale that the buyer picked before a cart existed.
 *
 * The chart holds every seat picked on it under the token it was given, and draws those seats as chosen again the
 * next time it is opened under the same token. So a seat taken out of the basket while the map is closed has to be
 * given back here: nothing else on this side can reach the hold, and without it the buyer removes a seat, reopens
 * the map and finds it picked again.
 */
export async function releaseSessionSeats(
  eventUniqueId: string,
  sessionUniqueId: string,
  request: ReleaseSessionSeatsRequest,
): Promise<void> {
  await client.post<unknown>(
    API_ROUTES.eventRegistrationSessionSeatRelease(eventUniqueId, sessionUniqueId),
    request,
  )
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

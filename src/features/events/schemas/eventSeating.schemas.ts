import { z } from "zod"

const seatingCategorySchema = z.object({
  CategoryKey: z.string().optional(),
  categoryKey: z.string().optional(),
  CategoryName: z.string().optional(),
  categoryName: z.string().optional(),
  TicketTypeUniqueId: z.string().optional(),
  ticketTypeUniqueId: z.string().optional(),
  TicketTypeName: z.string().optional(),
  ticketTypeName: z.string().optional(),
  Price: z.number().optional(),
  price: z.number().optional(),
  Color: z.string().optional(),
  color: z.string().optional(),
  ShowRemainingTickets: z.boolean().optional(),
  showRemainingTickets: z.boolean().optional(),
  RemainingSeats: z.number().nullable().optional(),
  remainingSeats: z.number().nullable().optional(),
})

const selectedSeatSchema = z.object({
  ObjectLabel: z.string().optional(),
  objectLabel: z.string().optional(),
  CategoryKey: z.string().optional(),
  categoryKey: z.string().optional(),
  TicketTypeUniqueId: z.string().optional(),
  ticketTypeUniqueId: z.string().optional(),
  TicketTypeName: z.string().optional(),
  ticketTypeName: z.string().optional(),
  Price: z.number().optional(),
  price: z.number().optional(),
})

const seatingMapSchema = z.object({
  SessionUniqueId: z.string().optional(),
  sessionUniqueId: z.string().optional(),
  SeatsIoPublicKey: z.string().optional(),
  seatsIoPublicKey: z.string().optional(),
  Region: z.string().optional(),
  region: z.string().optional(),
  SeatsIoEventKey: z.string().optional(),
  seatsIoEventKey: z.string().optional(),
  HoldToken: z.string().optional(),
  holdToken: z.string().optional(),
  HoldTokenExpiresAtUtc: z.string().optional(),
  holdTokenExpiresAtUtc: z.string().optional(),
  Categories: z.array(seatingCategorySchema).optional(),
  categories: z.array(seatingCategorySchema).optional(),
  SelectedSeats: z.array(selectedSeatSchema).optional(),
  selectedSeats: z.array(selectedSeatSchema).optional(),
})

/** One chart category, against the ticket type that decides what a seat in it costs. */
export interface EventSeatingCategory {
  categoryKey: string
  categoryName: string
  ticketTypeUniqueId: string
  ticketTypeName: string
  price: number
  /** Colour the chart draws this category in, used as the legend swatch. */
  color: string
  /** Whether the organizer chose to tell buyers how many seats are left in this category. */
  showRemainingTickets: boolean
  /** Seats still on sale, or null when there is no capacity to count down from. Zero means sold out. */
  remainingSeats: number | null
}

/** One seat this cart is holding. */
export interface EventSeat {
  objectLabel: string
  categoryKey: string
  ticketTypeUniqueId: string
  ticketTypeName: string
  price: number
}

/** Everything the browser needs to draw a session's seat map and hold seats on it. */
export interface EventSeatingMap {
  sessionUniqueId: string
  /** Workspace key the chart renders with. Never the secret key, which stays on the server. */
  seatsIoPublicKey: string
  region: string
  seatsIoEventKey: string
  holdToken: string
  holdTokenExpiresAtUtc: string | null
  categories: EventSeatingCategory[]
  selectedSeats: EventSeat[]
}

/** Asks for one seat to be held for this cart. */
export interface HoldEventSeatRequest {
  sessionUniqueId: string
  objectLabel: string
}

/** Asks for one held seat to go back on sale. */
export interface ReleaseEventSeatRequest {
  sessionUniqueId: string
  objectLabel: string
}

/**
 * Reads the seating map the API answered with.
 *
 * The response is parsed rather than trusted: a chart drawn against a missing public key or event key would render
 * as an empty grey box with no way for the buyer to tell what went wrong.
 */
export function normalizeEventSeatingMap(payload: unknown): EventSeatingMap {
  const parsed = seatingMapSchema.parse(payload)

  return {
    sessionUniqueId: parsed.SessionUniqueId ?? parsed.sessionUniqueId ?? "",
    seatsIoPublicKey: parsed.SeatsIoPublicKey ?? parsed.seatsIoPublicKey ?? "",
    region: parsed.Region ?? parsed.region ?? "",
    seatsIoEventKey: parsed.SeatsIoEventKey ?? parsed.seatsIoEventKey ?? "",
    holdToken: parsed.HoldToken ?? parsed.holdToken ?? "",
    holdTokenExpiresAtUtc: parsed.HoldTokenExpiresAtUtc ?? parsed.holdTokenExpiresAtUtc ?? null,
    categories: (parsed.Categories ?? parsed.categories ?? []).map((item) => ({
      categoryKey: item.CategoryKey ?? item.categoryKey ?? "",
      categoryName: item.CategoryName ?? item.categoryName ?? "",
      ticketTypeUniqueId: item.TicketTypeUniqueId ?? item.ticketTypeUniqueId ?? "",
      ticketTypeName: item.TicketTypeName ?? item.ticketTypeName ?? "",
      price: item.Price ?? item.price ?? 0,
      color: item.Color ?? item.color ?? "",
      showRemainingTickets: item.ShowRemainingTickets ?? item.showRemainingTickets ?? false,
      remainingSeats: item.RemainingSeats ?? item.remainingSeats ?? null,
    })),
    selectedSeats: (parsed.SelectedSeats ?? parsed.selectedSeats ?? []).map((item) => ({
      objectLabel: item.ObjectLabel ?? item.objectLabel ?? "",
      categoryKey: item.CategoryKey ?? item.categoryKey ?? "",
      ticketTypeUniqueId: item.TicketTypeUniqueId ?? item.ticketTypeUniqueId ?? "",
      ticketTypeName: item.TicketTypeName ?? item.ticketTypeName ?? "",
      price: item.Price ?? item.price ?? 0,
    })),
  }
}

import { z } from "zod"

// Every field is read as optional and nullable: the API sends PascalCase, an older deployment may omit a field, and
// a null anywhere in the payload must not cost the buyer the whole seat map when a sensible default exists.

const seatingCategorySchema = z.object({
  CategoryKey: z.string().nullable().optional(),
  categoryKey: z.string().nullable().optional(),
  CategoryName: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  TicketTypeUniqueId: z.string().nullable().optional(),
  ticketTypeUniqueId: z.string().nullable().optional(),
  TicketTypeName: z.string().nullable().optional(),
  ticketTypeName: z.string().nullable().optional(),
  Price: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  Color: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  MaxPurchase: z.number().nullable().optional(),
  maxPurchase: z.number().nullable().optional(),
  ShowRemainingTickets: z.boolean().nullable().optional(),
  showRemainingTickets: z.boolean().nullable().optional(),
  RemainingSeats: z.number().nullable().optional(),
  remainingSeats: z.number().nullable().optional(),
})

const selectedSeatSchema = z.object({
  ObjectLabel: z.string().nullable().optional(),
  objectLabel: z.string().nullable().optional(),
  ObjectType: z.string().nullable().optional(),
  objectType: z.string().nullable().optional(),
  CategoryKey: z.string().nullable().optional(),
  categoryKey: z.string().nullable().optional(),
  TicketTypeUniqueId: z.string().nullable().optional(),
  ticketTypeUniqueId: z.string().nullable().optional(),
  TicketTypeName: z.string().nullable().optional(),
  ticketTypeName: z.string().nullable().optional(),
  Price: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
})

const seatingMapSchema = z.object({
  SessionUniqueId: z.string().nullable().optional(),
  sessionUniqueId: z.string().nullable().optional(),
  SeatsIoPublicKey: z.string().nullable().optional(),
  seatsIoPublicKey: z.string().nullable().optional(),
  Region: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  SeatsIoEventKey: z.string().nullable().optional(),
  seatsIoEventKey: z.string().nullable().optional(),
  HoldToken: z.string().nullable().optional(),
  holdToken: z.string().nullable().optional(),
  HoldTokenExpiresAtUtc: z.string().nullable().optional(),
  holdTokenExpiresAtUtc: z.string().nullable().optional(),
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
  /** The most seats of this category one order may take, or null when the organizer set no limit. */
  maxPurchase: number | null
  /** Whether the organizer chose to tell buyers how many seats are left in this category. */
  showRemainingTickets: boolean
  /** Seats still on sale, or null when there is no capacity to count down from. Zero means sold out. */
  remainingSeats: number | null
}

/** One seat this cart is holding. */
export interface EventSeat {
  objectLabel: string
  /**
   * What the plan draws the object as — "seat", "table", "booth" or "generalAdmission" — or empty when the server
   * knows of none. The label alone cannot tell a table sold whole from a chair sitting at one.
   */
  objectType: string
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
  /**
   * Token the browser was already holding seats under before this cart existed, or omitted when it holds none.
   * A cart with no token of its own takes it over, so seats picked before the buyer gave their name stay theirs.
   */
  holdToken?: string
}

/** A token the chart can hold seats under before there is a cart to hold them in. */
export interface EventSeatHoldToken {
  holdToken: string
  expiresAtUtc: string | null
}

const seatHoldTokenSchema = z.object({
  HoldToken: z.string().nullable().optional(),
  holdToken: z.string().nullable().optional(),
  ExpiresAtUtc: z.string().nullable().optional(),
  expiresAtUtc: z.string().nullable().optional(),
})

/**
 * Reads the hold token the API issued.
 *
 * An empty token is refused rather than carried: a chart drawn against one holds nothing, and every seat the buyer
 * picks on it stays on sale for somebody else to take.
 */
export function normalizeEventSeatHoldToken(payload: unknown): EventSeatHoldToken {
  const parsed = seatHoldTokenSchema.parse(payload)
  const holdToken = parsed.HoldToken ?? parsed.holdToken ?? ""

  if (!holdToken) {
    throw new Error("The seat map could not be opened for picking.")
  }

  return {
    holdToken,
    expiresAtUtc: parsed.ExpiresAtUtc ?? parsed.expiresAtUtc ?? null,
  }
}

/** Asks for seats this browser holds before any cart exists to go back on sale. */
export interface ReleaseSessionSeatsRequest {
  holdToken: string
  objectLabels: string[]
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
      maxPurchase: item.MaxPurchase ?? item.maxPurchase ?? null,
      showRemainingTickets: item.ShowRemainingTickets ?? item.showRemainingTickets ?? false,
      remainingSeats: item.RemainingSeats ?? item.remainingSeats ?? null,
    })),
    selectedSeats: (parsed.SelectedSeats ?? parsed.selectedSeats ?? []).map((item) => ({
      objectLabel: item.ObjectLabel ?? item.objectLabel ?? "",
      objectType: item.ObjectType ?? item.objectType ?? "",
      categoryKey: item.CategoryKey ?? item.categoryKey ?? "",
      ticketTypeUniqueId: item.TicketTypeUniqueId ?? item.ticketTypeUniqueId ?? "",
      ticketTypeName: item.TicketTypeName ?? item.ticketTypeName ?? "",
      price: item.Price ?? item.price ?? 0,
    })),
  }
}

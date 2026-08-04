import { z } from "zod"

export const EVENT_ORDER_STATES = ["Confirmed", "Processing", "Failed"] as const

export type EventOrderState = (typeof EVENT_ORDER_STATES)[number]

const orderStateSchema = z.enum(EVENT_ORDER_STATES)

const eventOrderTicketSchema = z.object({
  TicketUniqueId: z.string().optional(),
  ticketUniqueId: z.string().optional(),
  TicketCode: z.string().optional(),
  ticketCode: z.string().optional(),
  TicketTypeName: z.string().optional(),
  ticketTypeName: z.string().optional(),
  SessionName: z.string().optional(),
  sessionName: z.string().optional(),
  SessionStartDateUtc: z.string().nullable().optional(),
  sessionStartDateUtc: z.string().nullable().optional(),
  AttendeeName: z.string().nullable().optional(),
  attendeeName: z.string().nullable().optional(),
  TicketStatus: z.string().optional(),
  ticketStatus: z.string().optional(),
})

const eventOrderStatusSchema = z.object({
  OrderUniqueId: z.string().optional(),
  orderUniqueId: z.string().optional(),
  InvoiceNo: z.string().optional(),
  invoiceNo: z.string().optional(),
  OrderState: orderStateSchema.optional(),
  orderState: orderStateSchema.optional(),
  InvoiceStatus: z.string().optional(),
  invoiceStatus: z.string().optional(),
  PollAfterSeconds: z.number().optional(),
  pollAfterSeconds: z.number().optional(),
  BuyerName: z.string().nullable().optional(),
  buyerName: z.string().nullable().optional(),
  BuyerEmailMasked: z.string().nullable().optional(),
  buyerEmailMasked: z.string().nullable().optional(),
  TotalAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  CurrencySymbol: z.string().nullable().optional(),
  currencySymbol: z.string().nullable().optional(),
  EventName: z.string().optional(),
  eventName: z.string().optional(),
  EventThemeColor: z.string().nullable().optional(),
  eventThemeColor: z.string().nullable().optional(),
  EventStartDateUtc: z.string().nullable().optional(),
  eventStartDateUtc: z.string().nullable().optional(),
  EventEndDateUtc: z.string().nullable().optional(),
  eventEndDateUtc: z.string().nullable().optional(),
  VenueName: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  VenueAddress: z.string().nullable().optional(),
  venueAddress: z.string().nullable().optional(),
  VenueMapUrl: z.string().nullable().optional(),
  venueMapUrl: z.string().nullable().optional(),
  Tickets: z.array(eventOrderTicketSchema).optional(),
  tickets: z.array(eventOrderTicketSchema).optional(),
})

export interface EventOrderTicket {
  ticketUniqueId: string
  ticketCode: string
  ticketTypeName: string
  sessionName: string
  sessionStartDateUtc: string | null
  attendeeName: string | null
  ticketStatus: string
}

export interface EventOrderStatus {
  orderUniqueId: string
  invoiceNo: string
  orderState: EventOrderState
  invoiceStatus: string
  /** Zero once the order is terminal, which is the server telling the page to stop polling. */
  pollAfterSeconds: number
  buyerName: string | null
  buyerEmailMasked: string | null
  totalAmount: number
  currencySymbol: string | null
  eventName: string
  eventThemeColor: string | null
  eventStartDateUtc: string | null
  eventEndDateUtc: string | null
  venueName: string | null
  venueAddress: string | null
  venueMapUrl: string | null
  tickets: EventOrderTicket[]
}

export function normalizeEventOrderStatus(payload: unknown): EventOrderStatus {
  const parsed = eventOrderStatusSchema.parse(payload)

  return {
    orderUniqueId: parsed.OrderUniqueId ?? parsed.orderUniqueId ?? "",
    invoiceNo: parsed.InvoiceNo ?? parsed.invoiceNo ?? "",
    orderState: parsed.OrderState ?? parsed.orderState ?? "Processing",
    invoiceStatus: parsed.InvoiceStatus ?? parsed.invoiceStatus ?? "",
    pollAfterSeconds: parsed.PollAfterSeconds ?? parsed.pollAfterSeconds ?? 0,
    buyerName: parsed.BuyerName ?? parsed.buyerName ?? null,
    buyerEmailMasked: parsed.BuyerEmailMasked ?? parsed.buyerEmailMasked ?? null,
    totalAmount: parsed.TotalAmount ?? parsed.totalAmount ?? 0,
    currencySymbol: parsed.CurrencySymbol ?? parsed.currencySymbol ?? null,
    eventName: parsed.EventName ?? parsed.eventName ?? "",
    eventThemeColor: parsed.EventThemeColor ?? parsed.eventThemeColor ?? null,
    eventStartDateUtc: parsed.EventStartDateUtc ?? parsed.eventStartDateUtc ?? null,
    eventEndDateUtc: parsed.EventEndDateUtc ?? parsed.eventEndDateUtc ?? null,
    venueName: parsed.VenueName ?? parsed.venueName ?? null,
    venueAddress: parsed.VenueAddress ?? parsed.venueAddress ?? null,
    venueMapUrl: parsed.VenueMapUrl ?? parsed.venueMapUrl ?? null,
    tickets: (parsed.Tickets ?? parsed.tickets ?? []).map((ticket) => ({
      ticketUniqueId: ticket.TicketUniqueId ?? ticket.ticketUniqueId ?? "",
      ticketCode: ticket.TicketCode ?? ticket.ticketCode ?? "",
      ticketTypeName: ticket.TicketTypeName ?? ticket.ticketTypeName ?? "",
      sessionName: ticket.SessionName ?? ticket.sessionName ?? "",
      sessionStartDateUtc: ticket.SessionStartDateUtc ?? ticket.sessionStartDateUtc ?? null,
      attendeeName: ticket.AttendeeName ?? ticket.attendeeName ?? null,
      ticketStatus: ticket.TicketStatus ?? ticket.ticketStatus ?? "",
    })),
  }
}

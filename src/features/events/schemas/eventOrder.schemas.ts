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

const eventOrderChargeSchema = z.object({
  Label: z.string().optional(),
  label: z.string().optional(),
  ChargeKind: z.string().optional(),
  chargeKind: z.string().optional(),
  Amount: z.number().optional(),
  amount: z.number().optional(),
})

const eventOrderLineItemSchema = z.object({
  SessionName: z.string().optional(),
  sessionName: z.string().optional(),
  TicketTypeName: z.string().optional(),
  ticketTypeName: z.string().optional(),
  Quantity: z.number().optional(),
  quantity: z.number().optional(),
  UnitPrice: z.number().optional(),
  unitPrice: z.number().optional(),
  DiscountAmount: z.number().nullable().optional(),
  discountAmount: z.number().nullable().optional(),
  LineTotal: z.number().optional(),
  lineTotal: z.number().optional(),
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
  SubTotal: z.number().optional(),
  subTotal: z.number().optional(),
  DiscountAmount: z.number().nullable().optional(),
  discountAmount: z.number().nullable().optional(),
  DiscountCouponCode: z.string().nullable().optional(),
  discountCouponCode: z.string().nullable().optional(),
  TaxAmount: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  PlatformCharges: z.number().nullable().optional(),
  platformCharges: z.number().nullable().optional(),
  ServiceCharges: z.number().nullable().optional(),
  serviceCharges: z.number().nullable().optional(),
  TotalAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  AmountPaid: z.number().optional(),
  amountPaid: z.number().optional(),
  BalanceAmount: z.number().nullable().optional(),
  balanceAmount: z.number().nullable().optional(),
  CurrencySymbol: z.string().nullable().optional(),
  currencySymbol: z.string().nullable().optional(),
  Charges: z.array(eventOrderChargeSchema).optional(),
  charges: z.array(eventOrderChargeSchema).optional(),
  LineItems: z.array(eventOrderLineItemSchema).optional(),
  lineItems: z.array(eventOrderLineItemSchema).optional(),
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

export interface EventOrderCharge {
  label: string
  chargeKind: string
  amount: number
}

export interface EventOrderLineItem {
  sessionName: string
  ticketTypeName: string
  quantity: number
  unitPrice: number
  discountAmount: number | null
  lineTotal: number
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
  subTotal: number
  discountAmount: number | null
  discountCouponCode: string | null
  taxAmount: number | null
  platformCharges: number | null
  serviceCharges: number | null
  totalAmount: number
  amountPaid: number
  /** Null once nothing is owed, so a settled order renders no balance row at all. */
  balanceAmount: number | null
  currencySymbol: string | null
  charges: EventOrderCharge[]
  lineItems: EventOrderLineItem[]
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
    subTotal: parsed.SubTotal ?? parsed.subTotal ?? 0,
    discountAmount: parsed.DiscountAmount ?? parsed.discountAmount ?? null,
    discountCouponCode: parsed.DiscountCouponCode ?? parsed.discountCouponCode ?? null,
    taxAmount: parsed.TaxAmount ?? parsed.taxAmount ?? null,
    platformCharges: parsed.PlatformCharges ?? parsed.platformCharges ?? null,
    serviceCharges: parsed.ServiceCharges ?? parsed.serviceCharges ?? null,
    totalAmount: parsed.TotalAmount ?? parsed.totalAmount ?? 0,
    amountPaid: parsed.AmountPaid ?? parsed.amountPaid ?? 0,
    balanceAmount: parsed.BalanceAmount ?? parsed.balanceAmount ?? null,
    currencySymbol: parsed.CurrencySymbol ?? parsed.currencySymbol ?? null,
    charges: (parsed.Charges ?? parsed.charges ?? []).map((charge) => ({
      label: charge.Label ?? charge.label ?? "",
      chargeKind: charge.ChargeKind ?? charge.chargeKind ?? "",
      amount: charge.Amount ?? charge.amount ?? 0,
    })),
    lineItems: (parsed.LineItems ?? parsed.lineItems ?? []).map((line) => ({
      sessionName: line.SessionName ?? line.sessionName ?? "",
      ticketTypeName: line.TicketTypeName ?? line.ticketTypeName ?? "",
      quantity: line.Quantity ?? line.quantity ?? 0,
      unitPrice: line.UnitPrice ?? line.unitPrice ?? 0,
      discountAmount: line.DiscountAmount ?? line.discountAmount ?? null,
      lineTotal: line.LineTotal ?? line.lineTotal ?? 0,
    })),
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

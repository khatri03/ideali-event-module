import { z } from "zod"

export const paymentProductSchema = z.enum([
  "CreditCard",
  "ElectronicCheck",
  "Cheque",
  "Ach",
  "Pad",
  "TapToPay",
  "WalletPay",
])
export type PaymentProduct = z.infer<typeof paymentProductSchema>

export const invoiceStatusSchema = z.enum([
  "PendingPayment",
  "PartiallyPaid",
  "Paid",
  "Cancelled",
  "Refund",
  "AdjustedInSystem",
  "PartiallyRefunded",
  "Failed",
])
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>

export const ticketReservationStatusSchema = z.enum(["Active", "Confirmed", "Expired", "Cancelled"])
export type TicketReservationStatus = z.infer<typeof ticketReservationStatusSchema>

const eventCartLineSchema = z.object({
  LineUniqueId: z.string().optional(),
  lineUniqueId: z.string().optional(),
  SessionUniqueId: z.string().optional(),
  sessionUniqueId: z.string().optional(),
  TicketTypeUniqueId: z.string().optional(),
  ticketTypeUniqueId: z.string().optional(),
  TicketTypeName: z.string().optional(),
  ticketTypeName: z.string().optional(),
  Quantity: z.number().int().optional(),
  quantity: z.number().int().optional(),
  UnitPrice: z.number().optional(),
  unitPrice: z.number().optional(),
  LineTotal: z.number().optional(),
  lineTotal: z.number().optional(),
  DiscountAmount: z.number().nullable().optional(),
  discountAmount: z.number().nullable().optional(),
  ReservationStatus: ticketReservationStatusSchema.optional(),
  reservationStatus: ticketReservationStatusSchema.optional(),
})

const eventCartSchema = z.object({
  CartUniqueId: z.string().optional(),
  cartUniqueId: z.string().optional(),
  InvoiceNo: z.string().optional(),
  invoiceNo: z.string().optional(),
  EventUniqueId: z.string().optional(),
  eventUniqueId: z.string().optional(),
  ExpiresAtUtc: z.string().nullable().optional(),
  expiresAtUtc: z.string().nullable().optional(),
  SubTotal: z.number().optional(),
  subTotal: z.number().optional(),
  DiscountAmount: z.number().nullable().optional(),
  discountAmount: z.number().nullable().optional(),
  NetSubtotal: z.number().optional(),
  netSubtotal: z.number().optional(),
  TotalAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  Lines: z.array(eventCartLineSchema).optional(),
  lines: z.array(eventCartLineSchema).optional(),
})

export interface EventCartLine {
  lineUniqueId: string
  sessionUniqueId: string
  ticketTypeUniqueId: string
  ticketTypeName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  discountAmount: number | null
  reservationStatus: TicketReservationStatus
}

export interface EventCart {
  cartUniqueId: string
  invoiceNo: string
  eventUniqueId: string
  expiresAtUtc: string | null
  subTotal: number
  discountAmount: number | null
  netSubtotal: number
  totalAmount: number
  lines: EventCartLine[]
}

function normalizeCartLine(item: z.infer<typeof eventCartLineSchema>): EventCartLine {
  return {
    lineUniqueId: item.LineUniqueId ?? item.lineUniqueId ?? "",
    sessionUniqueId: item.SessionUniqueId ?? item.sessionUniqueId ?? "",
    ticketTypeUniqueId: item.TicketTypeUniqueId ?? item.ticketTypeUniqueId ?? "",
    ticketTypeName: item.TicketTypeName ?? item.ticketTypeName ?? "",
    quantity: item.Quantity ?? item.quantity ?? 0,
    unitPrice: item.UnitPrice ?? item.unitPrice ?? 0,
    lineTotal: item.LineTotal ?? item.lineTotal ?? 0,
    discountAmount: item.DiscountAmount ?? item.discountAmount ?? null,
    reservationStatus: item.ReservationStatus ?? item.reservationStatus ?? "Active",
  }
}

export function normalizeEventCart(payload: unknown): EventCart {
  const parsed = eventCartSchema.parse(payload)

  return {
    cartUniqueId: parsed.CartUniqueId ?? parsed.cartUniqueId ?? "",
    invoiceNo: parsed.InvoiceNo ?? parsed.invoiceNo ?? "",
    eventUniqueId: parsed.EventUniqueId ?? parsed.eventUniqueId ?? "",
    expiresAtUtc: parsed.ExpiresAtUtc ?? parsed.expiresAtUtc ?? null,
    subTotal: parsed.SubTotal ?? parsed.subTotal ?? 0,
    discountAmount: parsed.DiscountAmount ?? parsed.discountAmount ?? null,
    netSubtotal: parsed.NetSubtotal ?? parsed.netSubtotal ?? 0,
    totalAmount: parsed.TotalAmount ?? parsed.totalAmount ?? 0,
    lines: (parsed.Lines ?? parsed.lines ?? []).map(normalizeCartLine),
  }
}

const eventCartPaymentChargeSchema = z.object({
  Source: z.string().optional(),
  source: z.string().optional(),
  Title: z.string().optional(),
  title: z.string().optional(),
  ValueType: z.string().optional(),
  valueType: z.string().optional(),
  Value: z.number().optional(),
  value: z.number().optional(),
  Amount: z.number().optional(),
  amount: z.number().optional(),
})

const eventCartPaymentBreakdownSchema = z.object({
  PaymentMethod: paymentProductSchema.optional(),
  paymentMethod: paymentProductSchema.optional(),
  Label: z.string().optional(),
  label: z.string().optional(),
  IsOrganizerOnly: z.boolean().optional(),
  isOrganizerOnly: z.boolean().optional(),
  MerchantName: z.string().nullable().optional(),
  merchantName: z.string().nullable().optional(),
  Subtotal: z.number().optional(),
  subtotal: z.number().optional(),
  BuyerChargeTotal: z.number().optional(),
  buyerChargeTotal: z.number().optional(),
  GrandTotal: z.number().optional(),
  grandTotal: z.number().optional(),
  Charges: z.array(eventCartPaymentChargeSchema).optional(),
  charges: z.array(eventCartPaymentChargeSchema).optional(),
})

const eventCartPriceSchema = z.object({
  CartUniqueId: z.string().optional(),
  cartUniqueId: z.string().optional(),
  SubTotal: z.number().optional(),
  subTotal: z.number().optional(),
  DiscountAmount: z.number().optional(),
  discountAmount: z.number().optional(),
  NetSubtotal: z.number().optional(),
  netSubtotal: z.number().optional(),
  PaymentBreakdowns: z.array(eventCartPaymentBreakdownSchema).optional(),
  paymentBreakdowns: z.array(eventCartPaymentBreakdownSchema).optional(),
})

export interface EventCartPaymentCharge {
  source: string
  title: string
  valueType: string
  value: number
  amount: number
}

export interface EventCartPaymentBreakdown {
  paymentMethod: PaymentProduct
  label: string
  isOrganizerOnly: boolean
  merchantName: string | null
  subtotal: number
  buyerChargeTotal: number
  grandTotal: number
  charges: EventCartPaymentCharge[]
}

export interface EventCartPrice {
  cartUniqueId: string
  subTotal: number
  discountAmount: number
  netSubtotal: number
  paymentBreakdowns: EventCartPaymentBreakdown[]
}

export function normalizeEventCartPrice(payload: unknown): EventCartPrice {
  const parsed = eventCartPriceSchema.parse(payload)

  return {
    cartUniqueId: parsed.CartUniqueId ?? parsed.cartUniqueId ?? "",
    subTotal: parsed.SubTotal ?? parsed.subTotal ?? 0,
    discountAmount: parsed.DiscountAmount ?? parsed.discountAmount ?? 0,
    netSubtotal: parsed.NetSubtotal ?? parsed.netSubtotal ?? 0,
    paymentBreakdowns: (parsed.PaymentBreakdowns ?? parsed.paymentBreakdowns ?? []).map((breakdown) => ({
      paymentMethod: breakdown.PaymentMethod ?? breakdown.paymentMethod ?? "CreditCard",
      label: breakdown.Label ?? breakdown.label ?? "",
      isOrganizerOnly: breakdown.IsOrganizerOnly ?? breakdown.isOrganizerOnly ?? false,
      merchantName: breakdown.MerchantName ?? breakdown.merchantName ?? null,
      subtotal: breakdown.Subtotal ?? breakdown.subtotal ?? 0,
      buyerChargeTotal: breakdown.BuyerChargeTotal ?? breakdown.buyerChargeTotal ?? 0,
      grandTotal: breakdown.GrandTotal ?? breakdown.grandTotal ?? 0,
      charges: (breakdown.Charges ?? breakdown.charges ?? []).map((charge) => ({
        source: charge.Source ?? charge.source ?? "",
        title: charge.Title ?? charge.title ?? "",
        valueType: charge.ValueType ?? charge.valueType ?? "",
        value: charge.Value ?? charge.value ?? 0,
        amount: charge.Amount ?? charge.amount ?? 0,
      })),
    })),
  }
}

const eventPaymentIntentResultSchema = z.object({
  CartUniqueId: z.string().optional(),
  cartUniqueId: z.string().optional(),
  PaymentIntentId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  ClientSecret: z.string().optional(),
  clientSecret: z.string().optional(),
  InvoiceUniqueId: z.string().optional(),
  invoiceUniqueId: z.string().optional(),
  PublishableKey: z.string().optional(),
  publishableKey: z.string().optional(),
  StripeAccount: z.string().nullable().optional(),
  stripeAccount: z.string().nullable().optional(),
  PaymentMethod: paymentProductSchema.optional(),
  paymentMethod: paymentProductSchema.optional(),
  Amount: z.number().optional(),
  amount: z.number().optional(),
  Currency: z.string().optional(),
  currency: z.string().optional(),
  ProcessorFeeAmount: z.number().optional(),
  processorFeeAmount: z.number().optional(),
  Status: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
})

export interface EventPaymentIntentResult {
  cartUniqueId: string
  /** The order this intent pays for — the return URL a redirecting method comes back to. */
  invoiceUniqueId: string
  paymentIntentId: string
  clientSecret: string
  publishableKey: string
  stripeAccount: string | null
  paymentMethod: PaymentProduct
  amount: number
  currency: string
  processorFeeAmount: number
  status: string | null
}

export function normalizeEventPaymentIntentResult(payload: unknown): EventPaymentIntentResult {
  const parsed = eventPaymentIntentResultSchema.parse(payload)

  return {
    cartUniqueId: parsed.CartUniqueId ?? parsed.cartUniqueId ?? "",
    invoiceUniqueId: parsed.InvoiceUniqueId ?? parsed.invoiceUniqueId ?? "",
    paymentIntentId: parsed.PaymentIntentId ?? parsed.paymentIntentId ?? "",
    clientSecret: parsed.ClientSecret ?? parsed.clientSecret ?? "",
    publishableKey: parsed.PublishableKey ?? parsed.publishableKey ?? "",
    stripeAccount: parsed.StripeAccount ?? parsed.stripeAccount ?? null,
    paymentMethod: parsed.PaymentMethod ?? parsed.paymentMethod ?? "CreditCard",
    amount: parsed.Amount ?? parsed.amount ?? 0,
    currency: parsed.Currency ?? parsed.currency ?? "",
    processorFeeAmount: parsed.ProcessorFeeAmount ?? parsed.processorFeeAmount ?? 0,
    status: parsed.Status ?? parsed.status ?? null,
  }
}

const eventCheckoutLineTicketsSchema = z.object({
  LineUniqueId: z.string().optional(),
  lineUniqueId: z.string().optional(),
  TicketCodes: z.array(z.string()).optional(),
  ticketCodes: z.array(z.string()).optional(),
})

const eventCheckoutConfirmationSchema = z.object({
  CartUniqueId: z.string().optional(),
  cartUniqueId: z.string().optional(),
  InvoiceUniqueId: z.string().optional(),
  invoiceUniqueId: z.string().optional(),
  InvoiceStatus: invoiceStatusSchema.optional(),
  invoiceStatus: invoiceStatusSchema.optional(),
  IsSettled: z.boolean().optional(),
  isSettled: z.boolean().optional(),
  Lines: z.array(eventCheckoutLineTicketsSchema).optional(),
  lines: z.array(eventCheckoutLineTicketsSchema).optional(),
})

export interface EventCheckoutLineTickets {
  lineUniqueId: string
  ticketCodes: string[]
}

export interface EventCheckoutConfirmation {
  cartUniqueId: string
  /** Durable order reference. The cart id dies with the cart; this is what the buyer can return to. */
  invoiceUniqueId: string
  invoiceStatus: InvoiceStatus
  isSettled: boolean
  lines: EventCheckoutLineTickets[]
}

export function normalizeEventCheckoutConfirmation(payload: unknown): EventCheckoutConfirmation {
  const parsed = eventCheckoutConfirmationSchema.parse(payload)

  return {
    cartUniqueId: parsed.CartUniqueId ?? parsed.cartUniqueId ?? "",
    invoiceUniqueId: parsed.InvoiceUniqueId ?? parsed.invoiceUniqueId ?? "",
    invoiceStatus: parsed.InvoiceStatus ?? parsed.invoiceStatus ?? "PendingPayment",
    isSettled: parsed.IsSettled ?? parsed.isSettled ?? false,
    lines: (parsed.Lines ?? parsed.lines ?? []).map((line) => ({
      lineUniqueId: line.LineUniqueId ?? line.lineUniqueId ?? "",
      ticketCodes: line.TicketCodes ?? line.ticketCodes ?? [],
    })),
  }
}

export interface CreateEventCartRequest {
  eventUniqueId: string
  buyerContactId?: number | null
  buyerName?: string | null
  buyerEmail?: string | null
  buyerPhone?: string | null
}

export interface AddEventCartLineRequest {
  sessionUniqueId: string
  ticketTypeUniqueId: string
  quantity: number
  ticketPricePeriodUniqueId?: string | null
}

export interface PriceEventCartRequest {
  couponCode?: string | null
}

export interface LineAttendee {
  contactId?: number | null
  name: string
  email?: string | null
  phone?: string | null
}

export interface SubmitLineAttendeesRequest {
  attendees: LineAttendee[]
}

export interface EventOrderFormResponse {
  fieldUniqueId: string
  value?: string | null
  fileStorageId?: number | null
}

export interface EventOrderQuestionResponse {
  questionUniqueId: string
  optionUniqueId?: string | null
  value?: string | null
  fileStorageId?: number | null
}

export interface SubmitOrderAnswersRequest {
  formResponses: EventOrderFormResponse[]
  questionResponses: EventOrderQuestionResponse[]
}

export interface UploadedAnswerFile {
  fileStorageId: number
  fileName: string
}

export interface CreateEventPaymentIntentRequest {
  paymentMethod: PaymentProduct
  buyerName?: string | null
  buyerEmail?: string | null
}

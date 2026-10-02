import { z } from "zod"
import { client } from "@/api/client"
import type { ServiceResponse } from "@/api/types"
import { API_ROUTES } from "@/utils/routes"
import { endOfLocalDayAsUtcIso, startOfLocalDayAsUtcIso } from "@/utils/utcDates"

const serviceResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  timestamp: z.string().optional(),
  Data: z.unknown().optional(),
  data: z.unknown().optional(),
})

// Serialization casing is not guaranteed across endpoints, so every field is accepted in both forms and
// collapsed in the normalizers below - same approach as api/documentCategories.ts.
const dual = <T extends z.ZodTypeAny>(schema: T) => schema.optional()
const integer = () => z.coerce.number().int()

/**
 * Money stays decimal text the whole way to the screen. Nothing in this app does arithmetic on an
 * invoice figure - it renders totals the server already computed - so parsing them into floats would buy
 * nothing and cost precision on long amounts.
 */
const money = () => z.coerce.string()

/** A charge rule's own input: a percentage or a multiplier, not an amount of currency. */
const rate = () => z.coerce.number()

export type EventInvoiceSortBy = "invoiceNo" | "eventName" | "buyerName" | "invoiceStatus" | "invoiceDateUtc" | "dueDateUtc" | "totalAmount" | "balanceAmount"
export type EventInvoiceSortOrder = "asc" | "desc"

export const EVENT_INVOICE_STATUS_OPTIONS = [
  { value: "PendingPayment", label: "Pending Payment" },
  { value: "PartiallyPaid", label: "Partially Paid" },
  { value: "Paid", label: "Paid" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Refund", label: "Refund" },
  { value: "AdjustedInSystem", label: "Adjusted in System" },
  { value: "PartiallyRefunded", label: "Partially Refunded" },
  { value: "Failed", label: "Failed" },
] as const

/** Every status the API can put on an event invoice - adding one here forces every presentation map to
 * account for it rather than silently falling through to a neutral colour. */
export type EventInvoiceStatus = (typeof EVENT_INVOICE_STATUS_OPTIONS)[number]["value"]

export const EVENT_INVOICE_PAYMENT_METHOD_OPTIONS = [
  { value: "CreditCard", label: "Credit Card" },
  { value: "Ach", label: "ACH" },
  { value: "Pad", label: "PAD" },
  { value: "WalletPay", label: "Wallet Pay" },
  { value: "Cheque", label: "Cheque" },
] as const

const filterOptionSchema = z.object({
  Text: dual(z.string()),
  text: dual(z.string()),
  Value: dual(z.string()),
  value: dual(z.string()),
})

const sessionFilterOptionSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  EventUniqueId: dual(z.string()),
  eventUniqueId: dual(z.string()),
})

const filterOptionsSchema = z.object({
  Events: z.array(filterOptionSchema).optional(),
  events: z.array(filterOptionSchema).optional(),
  Sessions: z.array(sessionFilterOptionSchema).optional(),
  sessions: z.array(sessionFilterOptionSchema).optional(),
})

const listItemSchema = z.object({
  InvoiceUniqueId: dual(z.string()),
  invoiceUniqueId: dual(z.string()),
  InvoiceNo: dual(z.string()),
  invoiceNo: dual(z.string()),
  EventUniqueId: dual(z.string()),
  eventUniqueId: dual(z.string()),
  EventName: dual(z.string()),
  eventName: dual(z.string()),
  BuyerName: dual(z.string()),
  buyerName: dual(z.string()),
  BuyerEmail: dual(z.string().nullable()),
  buyerEmail: dual(z.string().nullable()),
  InvoiceStatus: dual(z.string()),
  invoiceStatus: dual(z.string()),
  InvoiceStatusLabel: dual(z.string()),
  invoiceStatusLabel: dual(z.string()),
  InvoiceType: dual(z.string()),
  invoiceType: dual(z.string()),
  InvoiceTypeLabel: dual(z.string()),
  invoiceTypeLabel: dual(z.string()),
  DueDateUtc: dual(z.string().nullable()),
  dueDateUtc: dual(z.string().nullable()),
  CompanyName: dual(z.string().nullable()),
  companyName: dual(z.string().nullable()),
  IsOverdue: dual(z.boolean()),
  isOverdue: dual(z.boolean()),
  CanMarkAsPaid: dual(z.boolean()),
  canMarkAsPaid: dual(z.boolean()),
  CanCancel: dual(z.boolean()),
  canCancel: dual(z.boolean()),
  CanSend: dual(z.boolean()),
  canSend: dual(z.boolean()),
  CanEdit: dual(z.boolean()),
  canEdit: dual(z.boolean()),
  InvoiceDateUtc: dual(z.string()),
  invoiceDateUtc: dual(z.string()),
  TotalAmount: dual(money()),
  totalAmount: dual(money()),
  BalanceAmount: dual(money().nullable()),
  balanceAmount: dual(money().nullable()),
  PaymentMethod: dual(z.string().nullable()),
  paymentMethod: dual(z.string().nullable()),
  PaymentSource: dual(z.string().nullable()),
  paymentSource: dual(z.string().nullable()),
  CurrencySymbol: dual(z.string()),
  currencySymbol: dual(z.string()),
  TicketCount: dual(integer()),
  ticketCount: dual(integer()),
})

const attendeeSchema = z.object({
  SlotIndex: dual(integer()),
  slotIndex: dual(integer()),
  Name: dual(z.string()),
  name: dual(z.string()),
  Email: dual(z.string().nullable()),
  email: dual(z.string().nullable()),
  Phone: dual(z.string().nullable()),
  phone: dual(z.string().nullable()),
})

const ticketSchema = z.object({
  TicketUniqueId: dual(z.string()),
  ticketUniqueId: dual(z.string()),
  TicketCode: dual(z.string()),
  ticketCode: dual(z.string()),
  SeatObjectLabel: dual(z.string().nullable()),
  seatObjectLabel: dual(z.string().nullable()),
  TicketStatus: dual(z.string()),
  ticketStatus: dual(z.string()),
  TicketStatusLabel: dual(z.string()),
  ticketStatusLabel: dual(z.string()),
  DeliveredAtUtc: dual(z.string().nullable()),
  deliveredAtUtc: dual(z.string().nullable()),
  CheckedInAtUtc: dual(z.string().nullable()),
  checkedInAtUtc: dual(z.string().nullable()),
})

const lineItemSchema = z.object({
  InvoiceItemUniqueId: dual(z.string()),
  invoiceItemUniqueId: dual(z.string()),
  SessionUniqueId: dual(z.string()),
  sessionUniqueId: dual(z.string()),
  SessionName: dual(z.string()),
  sessionName: dual(z.string()),
  TicketTypeName: dual(z.string()),
  ticketTypeName: dual(z.string()),
  Quantity: dual(integer()),
  quantity: dual(integer()),
  UnitPrice: dual(money()),
  unitPrice: dual(money()),
  LineTotal: dual(money()),
  lineTotal: dual(money()),
  Attendees: z.array(attendeeSchema).nullable().optional(),
  attendees: z.array(attendeeSchema).nullable().optional(),
  Tickets: z.array(ticketSchema).nullable().optional(),
  tickets: z.array(ticketSchema).nullable().optional(),
})

const customLineItemSchema = z.object({
  InvoiceItemUniqueId: dual(z.string()),
  invoiceItemUniqueId: dual(z.string()),
  Description: dual(z.string()),
  description: dual(z.string()),
  Amount: dual(money()),
  amount: dual(money()),
})

const paymentAttemptSchema = z.object({
  PaymentMethod: dual(z.string()),
  paymentMethod: dual(z.string()),
  PaymentStatus: dual(z.string()),
  paymentStatus: dual(z.string()),
  PaymentStatusLabel: dual(z.string()),
  paymentStatusLabel: dual(z.string()),
  Amount: dual(money()),
  amount: dual(money()),
  ReferenceNo: dual(z.string().nullable()),
  referenceNo: dual(z.string().nullable()),
  ErrorMessage: dual(z.string().nullable()),
  errorMessage: dual(z.string().nullable()),
  PaymentDateUtc: dual(z.string()),
  paymentDateUtc: dual(z.string()),
})

const invoiceNoteSchema = z.object({
  Note: dual(z.string()),
  note: dual(z.string()),
  CreatedBy: dual(z.string().nullable()),
  createdBy: dual(z.string().nullable()),
  CreatedOnUtc: dual(z.string()),
  createdOnUtc: dual(z.string()),
})

const chargeSchema = z.object({
  Label: dual(z.string()),
  label: dual(z.string()),
  ChargeKind: dual(z.string()),
  chargeKind: dual(z.string()),
  ChargeKindLabel: dual(z.string()),
  chargeKindLabel: dual(z.string()),
  SourceType: dual(z.string()),
  sourceType: dual(z.string()),
  SourceTypeLabel: dual(z.string()),
  sourceTypeLabel: dual(z.string()),
  CalculationType: dual(z.string()),
  calculationType: dual(z.string()),
  CalculationTypeLabel: dual(z.string()),
  calculationTypeLabel: dual(z.string()),
  SourceUniqueId: dual(z.string().nullable()),
  sourceUniqueId: dual(z.string().nullable()),
  Value: dual(rate()),
  value: dual(rate()),
  Amount: dual(money()),
  amount: dual(money()),
  DisplayOrder: dual(integer()),
  displayOrder: dual(integer()),
})

const linkedInvoiceSchema = z.object({
  InvoiceUniqueId: dual(z.string()),
  invoiceUniqueId: dual(z.string()),
  InvoiceNo: dual(z.string()),
  invoiceNo: dual(z.string()),
  InvoiceStatusLabel: dual(z.string()),
  invoiceStatusLabel: dual(z.string()),
})

const detailSchema = z.object({
  LinkedInvoice: linkedInvoiceSchema.nullable().optional(),
  linkedInvoice: linkedInvoiceSchema.nullable().optional(),
  InvoiceUniqueId: dual(z.string()),
  invoiceUniqueId: dual(z.string()),
  InvoiceNo: dual(z.string()),
  invoiceNo: dual(z.string()),
  InvoiceStatus: dual(z.string()),
  invoiceStatus: dual(z.string()),
  InvoiceStatusLabel: dual(z.string()),
  invoiceStatusLabel: dual(z.string()),
  InvoiceDateUtc: dual(z.string()),
  invoiceDateUtc: dual(z.string()),
  SubTotal: dual(money()),
  subTotal: dual(money()),
  DiscountAmount: dual(money().nullable()),
  discountAmount: dual(money().nullable()),
  DiscountCouponCode: dual(z.string().nullable()),
  discountCouponCode: dual(z.string().nullable()),
  TaxAmount: dual(money().nullable()),
  taxAmount: dual(money().nullable()),
  PlatformCharges: dual(money().nullable()),
  platformCharges: dual(money().nullable()),
  ServiceCharges: dual(money().nullable()),
  serviceCharges: dual(money().nullable()),
  TotalAmount: dual(money()),
  totalAmount: dual(money()),
  BalanceAmount: dual(money().nullable()),
  balanceAmount: dual(money().nullable()),
  CurrencySymbol: dual(z.string()),
  currencySymbol: dual(z.string()),
  EventUniqueId: dual(z.string()),
  eventUniqueId: dual(z.string()),
  EventName: dual(z.string()),
  eventName: dual(z.string()),
  BuyerName: dual(z.string()),
  buyerName: dual(z.string()),
  BuyerEmail: dual(z.string().nullable()),
  buyerEmail: dual(z.string().nullable()),
  BuyerPhone: dual(z.string().nullable()),
  buyerPhone: dual(z.string().nullable()),
  Charges: z.array(chargeSchema).nullable().optional(),
  charges: z.array(chargeSchema).nullable().optional(),
  LineItems: z.array(lineItemSchema).nullable().optional(),
  lineItems: z.array(lineItemSchema).nullable().optional(),
  CustomLineItems: z.array(customLineItemSchema).nullable().optional(),
  customLineItems: z.array(customLineItemSchema).nullable().optional(),
  Notes: z.array(invoiceNoteSchema).nullable().optional(),
  notes: z.array(invoiceNoteSchema).nullable().optional(),
  Payments: z.array(paymentAttemptSchema).nullable().optional(),
  payments: z.array(paymentAttemptSchema).nullable().optional(),
  InvoiceType: dual(z.string()),
  invoiceType: dual(z.string()),
  InvoiceTypeLabel: dual(z.string()),
  invoiceTypeLabel: dual(z.string()),
  CategoryName: dual(z.string().nullable()),
  categoryName: dual(z.string().nullable()),
  DueDateUtc: dual(z.string().nullable()),
  dueDateUtc: dual(z.string().nullable()),
  IsOverdue: dual(z.boolean()),
  isOverdue: dual(z.boolean()),
  SpecialNotes: dual(z.string().nullable()),
  specialNotes: dual(z.string().nullable()),
  CompanyName: dual(z.string().nullable()),
  companyName: dual(z.string().nullable()),
  BuyerFirstName: dual(z.string().nullable()),
  buyerFirstName: dual(z.string().nullable()),
  BuyerMiddleName: dual(z.string().nullable()),
  buyerMiddleName: dual(z.string().nullable()),
  BuyerLastName: dual(z.string().nullable()),
  buyerLastName: dual(z.string().nullable()),
  CanMarkAsPaid: dual(z.boolean()),
  canMarkAsPaid: dual(z.boolean()),
  CanCancel: dual(z.boolean()),
  canCancel: dual(z.boolean()),
  CanResendTickets: dual(z.boolean()),
  canResendTickets: dual(z.boolean()),
  CanEditBuyer: dual(z.boolean()),
  canEditBuyer: dual(z.boolean()),
  CanEdit: dual(z.boolean()),
  canEdit: dual(z.boolean()),
  CanPayOnline: dual(z.boolean()),
  canPayOnline: dual(z.boolean()),
})

const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    PageNo: dual(integer()),
    pageNo: dual(integer()),
    PageSize: dual(integer()),
    pageSize: dual(integer()),
    PageCount: dual(integer()),
    pageCount: dual(integer()),
    TotalRecordsCount: dual(integer()),
    totalRecordsCount: dual(integer()),
    PageData: z.array(item).optional(),
    pageData: z.array(item).optional(),
  })

export interface EventInvoiceListItem {
  invoiceUniqueId: string
  invoiceNo: string
  eventUniqueId: string
  eventName: string
  buyerName: string
  buyerEmail: string | null
  invoiceStatus: string
  /** Human-readable form of invoiceStatus - the raw value stays the key for colours and filters. */
  invoiceStatusLabel: string
  /** "Custom" or "Regular" - the raw enum name, so the list can mark custom rows apart from ticket rows. */
  invoiceType: string
  /** When a custom invoice's payment is due, or null on a ticket invoice that carries no due date. */
  dueDateUtc: string | null
  /** The billed company on a custom invoice, or null when the invoice names only a person. */
  companyName: string | null
  /** The server's verdict that this invoice is unpaid and past due - rendered as-is, never re-derived here. */
  isOverdue: boolean
  /** Server-decided row-action gates; the menu renders these, never inferring an action from the role. */
  canMarkAsPaid: boolean
  canCancel: boolean
  canSend: boolean
  /** True only for a Custom invoice still awaiting its first payment; ticket invoices are never editable here. */
  canEdit: boolean
  invoiceDateUtc: string
  /** Decimal text as the server wrote it - format with `formatCurrency`, never with float arithmetic. */
  totalAmount: string
  balanceAmount: string | null
  paymentMethod: string | null
  /** Card brand and last four, or bank name, as the gateway described the instrument. */
  paymentSource: string | null
  currencySymbol: string
  ticketCount: number
}

export interface EventInvoiceAttendee {
  /** Zero-based position matching the issued ticket at the same index. Used as the update key. */
  slotIndex: number
  name: string
  email: string | null
  phone: string | null
}

export interface EventInvoiceTicket {
  ticketUniqueId: string
  ticketCode: string
  /** The seat named as its layout names it, or null for a general-admission ticket. */
  seatObjectLabel: string | null
  ticketStatus: string
  ticketStatusLabel: string
  deliveredAtUtc: string | null
  checkedInAtUtc: string | null
}

export interface EventInvoiceLineItem {
  invoiceItemUniqueId: string
  sessionUniqueId: string
  sessionName: string
  ticketTypeName: string
  quantity: number
  unitPrice: string
  lineTotal: string
  attendees: EventInvoiceAttendee[]
  tickets: EventInvoiceTicket[]
}

export interface EventInvoiceCustomLineItem {
  invoiceItemUniqueId: string
  description: string
  /** Decimal text as the server wrote it - sum with `sumMoney`, format with `formatCurrency`, never float. */
  amount: string
}

export interface EventInvoicePaymentAttempt {
  paymentMethod: string
  paymentStatus: string
  paymentStatusLabel: string
  amount: string
  referenceNo: string | null
  errorMessage: string | null
  paymentDateUtc: string
}

export interface EventInvoiceCharge {
  label: string
  chargeKind: string
  chargeKindLabel: string
  sourceType: string
  sourceTypeLabel: string
  calculationType: string
  calculationTypeLabel: string
  sourceUniqueId: string | null
  /** The rule's own input - a percentage or a fixed multiplier, not currency. */
  value: number
  amount: string
  displayOrder: number
}

export interface EventInvoiceNote {
  note: string
  createdBy: string
  createdOnUtc: string
}

/** The other half of a reciprocal link - enough to name the linked invoice and open it. */
export interface EventInvoiceLinkedReference {
  invoiceUniqueId: string
  invoiceNo: string
  invoiceStatusLabel: string
}

export interface EventInvoiceDetail {
  invoiceUniqueId: string
  invoiceNo: string
  invoiceStatus: string
  invoiceStatusLabel: string
  invoiceDateUtc: string
  /** Decimal text as the server wrote it - format with `formatCurrency`, never with float arithmetic. */
  subTotal: string
  discountAmount: string | null
  discountCouponCode: string | null
  taxAmount: string | null
  platformCharges: string | null
  serviceCharges: string | null
  totalAmount: string
  balanceAmount: string | null
  currencySymbol: string
  eventUniqueId: string
  eventName: string
  buyerName: string
  buyerEmail: string | null
  buyerPhone: string | null
  charges: EventInvoiceCharge[]
  lineItems: EventInvoiceLineItem[]
  /** The Description/Amount lines of a custom invoice; empty on a ticket invoice. */
  customLineItems: EventInvoiceCustomLineItem[]
  notes: EventInvoiceNote[]
  payments: EventInvoicePaymentAttempt[]
  /** "Custom" or "Regular" - the detail page picks its body variant from this. */
  invoiceType: string
  /** Human-readable form of invoiceType. */
  invoiceTypeLabel: string
  /** The sponsorship category a custom invoice is billed under, or null when none. */
  categoryName: string | null
  /** When a custom invoice's payment is due, or null on a ticket invoice. */
  dueDateUtc: string | null
  /** The server's verdict that this invoice is unpaid and past due - rendered as-is, never re-derived here. */
  isOverdue: boolean
  /** Free-form notes captured on a custom invoice at authoring time, or null when none. */
  specialNotes: string | null
  /** The billed company on a custom invoice, or null when the invoice names only a person. */
  companyName: string | null
  buyerFirstName: string | null
  buyerMiddleName: string | null
  buyerLastName: string | null
  /** The server decides which manual actions the order still admits - never inferred from the role. */
  canMarkAsPaid: boolean
  canCancel: boolean
  canResendTickets: boolean
  canEditBuyer: boolean
  /** True only for a Custom invoice still awaiting its first payment; ticket invoices are never editable here. */
  canEdit: boolean
  /** The server's verdict that this invoice can take an online card payment - the 04-09 payable link reads it. */
  canPayOnline: boolean
  /** The invoice this one is linked to, or null when it stands alone. */
  linkedInvoice: EventInvoiceLinkedReference | null
}

export interface EventInvoiceFilterOption {
  uniqueId: string
  name: string
}

export interface EventInvoiceSessionFilterOption {
  uniqueId: string
  name: string
  eventUniqueId: string
}

export interface EventInvoiceFilterOptions {
  events: EventInvoiceFilterOption[]
  sessions: EventInvoiceSessionFilterOption[]
}

export interface EventInvoiceFilters {
  eventUniqueIds: string[]
  sessionUniqueIds: string[]
  statuses: string[]
  paymentMethods: string[]
  /** Raw invoice-type enum names ("Custom" / "Regular"); empty means every type. */
  invoiceTypes: string[]
  /** When true, the server returns only unpaid past-due rows. */
  overdueOnly: boolean
  invoiceDateFrom: string | null
  invoiceDateTo: string | null
  searchTerm: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function readResponseData(response: { Data?: unknown; data?: unknown }): unknown {
  return response.Data ?? response.data ?? null
}

function parseServicePayload(payload: unknown): unknown {
  const response = serviceResponseSchema.parse(payload) as
    | ServiceResponse<unknown>
    | { Data?: unknown; data?: unknown }
  return readResponseData(response)
}

const AWAITING_PAYMENT_STATUSES = ["PendingPayment", "PartiallyPaid"]

/**
 * Mirrors EventInvoiceActionRule.AllowsBuyerEdit. An order that has been cancelled, refunded or adjusted
 * is a closed financial record, so its buyer is fixed; listing what is allowed rather than what is not
 * keeps a status added later out until someone decides otherwise.
 */
const BUYER_EDITABLE_STATUSES = ["PendingPayment", "PartiallyPaid", "Paid", "Failed"]

/**
 * What the server would allow if it did not say. A response predating these flags still has to render
 * a usable page, and the endpoints enforce the same rule regardless of what the buttons show.
 */
function actionAllowance(raw: boolean | undefined, fallback: boolean) {
  return raw ?? fallback
}

/** The API sends the display text alongside the enum name; older responses may not, so fall back to it. */
function statusLabelOr(label: string | undefined, rawStatus: string) {
  return label?.trim() ? label : rawStatus
}

function normalizeListItem(raw: z.infer<typeof listItemSchema>): EventInvoiceListItem {
  const invoiceStatus = raw.InvoiceStatus ?? raw.invoiceStatus ?? ""
  const invoiceType = raw.InvoiceType ?? raw.invoiceType ?? "Regular"
  const isAwaitingPayment = AWAITING_PAYMENT_STATUSES.includes(invoiceStatus)

  return {
    invoiceUniqueId: raw.InvoiceUniqueId ?? raw.invoiceUniqueId ?? "",
    invoiceNo: raw.InvoiceNo ?? raw.invoiceNo ?? "",
    eventUniqueId: raw.EventUniqueId ?? raw.eventUniqueId ?? "",
    eventName: raw.EventName ?? raw.eventName ?? "",
    buyerName: raw.BuyerName ?? raw.buyerName ?? "",
    buyerEmail: raw.BuyerEmail ?? raw.buyerEmail ?? null,
    invoiceStatus,
    invoiceStatusLabel: statusLabelOr(raw.InvoiceStatusLabel ?? raw.invoiceStatusLabel, invoiceStatus),
    invoiceType,
    dueDateUtc: raw.DueDateUtc ?? raw.dueDateUtc ?? null,
    companyName: raw.CompanyName ?? raw.companyName ?? null,
    isOverdue: raw.IsOverdue ?? raw.isOverdue ?? false,
    canMarkAsPaid: actionAllowance(raw.CanMarkAsPaid ?? raw.canMarkAsPaid, isAwaitingPayment),
    canCancel: actionAllowance(raw.CanCancel ?? raw.canCancel, isAwaitingPayment),
    canSend: actionAllowance(raw.CanSend ?? raw.canSend, invoiceStatus !== "Cancelled"),
    canEdit: actionAllowance(raw.CanEdit ?? raw.canEdit, invoiceType === "Custom" && invoiceStatus === "PendingPayment"),
    invoiceDateUtc: raw.InvoiceDateUtc ?? raw.invoiceDateUtc ?? "",
    totalAmount: raw.TotalAmount ?? raw.totalAmount ?? "0",
    balanceAmount: raw.BalanceAmount ?? raw.balanceAmount ?? null,
    paymentMethod: raw.PaymentMethod ?? raw.paymentMethod ?? null,
    paymentSource: raw.PaymentSource ?? raw.paymentSource ?? null,
    currencySymbol: raw.CurrencySymbol ?? raw.currencySymbol ?? "$",
    ticketCount: raw.TicketCount ?? raw.ticketCount ?? 0,
  }
}

function normalizeAttendee(raw: z.infer<typeof attendeeSchema>): EventInvoiceAttendee {
  return {
    slotIndex: raw.SlotIndex ?? raw.slotIndex ?? 0,
    name: raw.Name ?? raw.name ?? "",
    email: raw.Email ?? raw.email ?? null,
    phone: raw.Phone ?? raw.phone ?? null,
  }
}

function normalizeTicket(raw: z.infer<typeof ticketSchema>): EventInvoiceTicket {
  const ticketStatus = raw.TicketStatus ?? raw.ticketStatus ?? ""

  return {
    ticketUniqueId: raw.TicketUniqueId ?? raw.ticketUniqueId ?? "",
    ticketCode: raw.TicketCode ?? raw.ticketCode ?? "",
    seatObjectLabel: raw.SeatObjectLabel ?? raw.seatObjectLabel ?? null,
    ticketStatus,
    ticketStatusLabel: statusLabelOr(raw.TicketStatusLabel ?? raw.ticketStatusLabel, ticketStatus),
    deliveredAtUtc: raw.DeliveredAtUtc ?? raw.deliveredAtUtc ?? null,
    checkedInAtUtc: raw.CheckedInAtUtc ?? raw.checkedInAtUtc ?? null,
  }
}

function normalizeLineItem(raw: z.infer<typeof lineItemSchema>): EventInvoiceLineItem {
  return {
    invoiceItemUniqueId: raw.InvoiceItemUniqueId ?? raw.invoiceItemUniqueId ?? "",
    sessionUniqueId: raw.SessionUniqueId ?? raw.sessionUniqueId ?? "",
    sessionName: raw.SessionName ?? raw.sessionName ?? "",
    ticketTypeName: raw.TicketTypeName ?? raw.ticketTypeName ?? "",
    quantity: raw.Quantity ?? raw.quantity ?? 0,
    unitPrice: raw.UnitPrice ?? raw.unitPrice ?? "0",
    lineTotal: raw.LineTotal ?? raw.lineTotal ?? "0",
    attendees: (raw.Attendees ?? raw.attendees ?? []).map(normalizeAttendee),
    tickets: (raw.Tickets ?? raw.tickets ?? []).map(normalizeTicket),
  }
}

function normalizeCustomLineItem(raw: z.infer<typeof customLineItemSchema>): EventInvoiceCustomLineItem {
  return {
    invoiceItemUniqueId: raw.InvoiceItemUniqueId ?? raw.invoiceItemUniqueId ?? "",
    description: raw.Description ?? raw.description ?? "",
    amount: raw.Amount ?? raw.amount ?? "0",
  }
}

function normalizePaymentAttempt(raw: z.infer<typeof paymentAttemptSchema>): EventInvoicePaymentAttempt {
  const paymentStatus = raw.PaymentStatus ?? raw.paymentStatus ?? ""

  return {
    paymentMethod: raw.PaymentMethod ?? raw.paymentMethod ?? "",
    paymentStatus,
    paymentStatusLabel: statusLabelOr(raw.PaymentStatusLabel ?? raw.paymentStatusLabel, paymentStatus),
    amount: raw.Amount ?? raw.amount ?? "0",
    referenceNo: raw.ReferenceNo ?? raw.referenceNo ?? null,
    errorMessage: raw.ErrorMessage ?? raw.errorMessage ?? null,
    paymentDateUtc: raw.PaymentDateUtc ?? raw.paymentDateUtc ?? "",
  }
}

function normalizeCharge(raw: z.infer<typeof chargeSchema>): EventInvoiceCharge {
  return {
    label: raw.Label ?? raw.label ?? "",
    chargeKind: raw.ChargeKind ?? raw.chargeKind ?? "",
    chargeKindLabel: raw.ChargeKindLabel ?? raw.chargeKindLabel ?? raw.ChargeKind ?? raw.chargeKind ?? "",
    sourceType: raw.SourceType ?? raw.sourceType ?? "",
    sourceTypeLabel: raw.SourceTypeLabel ?? raw.sourceTypeLabel ?? raw.SourceType ?? raw.sourceType ?? "",
    calculationType: raw.CalculationType ?? raw.calculationType ?? "",
    calculationTypeLabel: raw.CalculationTypeLabel ?? raw.calculationTypeLabel ?? raw.CalculationType ?? raw.calculationType ?? "",
    sourceUniqueId: raw.SourceUniqueId ?? raw.sourceUniqueId ?? null,
    value: raw.Value ?? raw.value ?? 0,
    amount: raw.Amount ?? raw.amount ?? "0",
    displayOrder: raw.DisplayOrder ?? raw.displayOrder ?? 0,
  }
}

function normalizeInvoiceNote(raw: z.infer<typeof invoiceNoteSchema>): EventInvoiceNote {
  return {
    note: raw.Note ?? raw.note ?? "",
    createdBy: raw.CreatedBy ?? raw.createdBy ?? "System",
    createdOnUtc: raw.CreatedOnUtc ?? raw.createdOnUtc ?? "",
  }
}

function normalizeLinkedInvoice(raw: z.infer<typeof linkedInvoiceSchema> | null | undefined): EventInvoiceLinkedReference | null {
  const invoiceUniqueId = raw?.InvoiceUniqueId ?? raw?.invoiceUniqueId
  if (!raw || !invoiceUniqueId) {
    return null
  }
  return {
    invoiceUniqueId,
    invoiceNo: raw.InvoiceNo ?? raw.invoiceNo ?? "",
    invoiceStatusLabel: raw.InvoiceStatusLabel ?? raw.invoiceStatusLabel ?? "",
  }
}

function normalizeDetail(raw: z.infer<typeof detailSchema>): EventInvoiceDetail {
  const invoiceStatus = raw.InvoiceStatus ?? raw.invoiceStatus ?? ""
  const invoiceType = raw.InvoiceType ?? raw.invoiceType ?? "Regular"
  const isAwaitingPayment = AWAITING_PAYMENT_STATUSES.includes(invoiceStatus)

  return {
    invoiceUniqueId: raw.InvoiceUniqueId ?? raw.invoiceUniqueId ?? "",
    invoiceNo: raw.InvoiceNo ?? raw.invoiceNo ?? "",
    invoiceStatus,
    invoiceStatusLabel: statusLabelOr(raw.InvoiceStatusLabel ?? raw.invoiceStatusLabel, invoiceStatus),
    invoiceDateUtc: raw.InvoiceDateUtc ?? raw.invoiceDateUtc ?? "",
    subTotal: raw.SubTotal ?? raw.subTotal ?? "0",
    discountAmount: raw.DiscountAmount ?? raw.discountAmount ?? null,
    discountCouponCode: raw.DiscountCouponCode ?? raw.discountCouponCode ?? null,
    taxAmount: raw.TaxAmount ?? raw.taxAmount ?? null,
    platformCharges: raw.PlatformCharges ?? raw.platformCharges ?? null,
    serviceCharges: raw.ServiceCharges ?? raw.serviceCharges ?? null,
    totalAmount: raw.TotalAmount ?? raw.totalAmount ?? "0",
    balanceAmount: raw.BalanceAmount ?? raw.balanceAmount ?? null,
    currencySymbol: raw.CurrencySymbol ?? raw.currencySymbol ?? "$",
    eventUniqueId: raw.EventUniqueId ?? raw.eventUniqueId ?? "",
    eventName: raw.EventName ?? raw.eventName ?? "",
    buyerName: raw.BuyerName ?? raw.buyerName ?? "",
    buyerEmail: raw.BuyerEmail ?? raw.buyerEmail ?? null,
    buyerPhone: raw.BuyerPhone ?? raw.buyerPhone ?? null,
    charges: (raw.Charges ?? raw.charges ?? []).map(normalizeCharge),
    lineItems: (raw.LineItems ?? raw.lineItems ?? []).map(normalizeLineItem),
    customLineItems: (raw.CustomLineItems ?? raw.customLineItems ?? []).map(normalizeCustomLineItem),
    notes: (raw.Notes ?? raw.notes ?? []).map(normalizeInvoiceNote),
    payments: (raw.Payments ?? raw.payments ?? []).map(normalizePaymentAttempt),
    invoiceType,
    invoiceTypeLabel: statusLabelOr(raw.InvoiceTypeLabel ?? raw.invoiceTypeLabel, invoiceType),
    categoryName: raw.CategoryName ?? raw.categoryName ?? null,
    dueDateUtc: raw.DueDateUtc ?? raw.dueDateUtc ?? null,
    isOverdue: raw.IsOverdue ?? raw.isOverdue ?? false,
    specialNotes: raw.SpecialNotes ?? raw.specialNotes ?? null,
    companyName: raw.CompanyName ?? raw.companyName ?? null,
    buyerFirstName: raw.BuyerFirstName ?? raw.buyerFirstName ?? null,
    buyerMiddleName: raw.BuyerMiddleName ?? raw.buyerMiddleName ?? null,
    buyerLastName: raw.BuyerLastName ?? raw.buyerLastName ?? null,
    canMarkAsPaid: actionAllowance(raw.CanMarkAsPaid ?? raw.canMarkAsPaid, isAwaitingPayment),
    canCancel: actionAllowance(raw.CanCancel ?? raw.canCancel, isAwaitingPayment),
    canResendTickets: actionAllowance(raw.CanResendTickets ?? raw.canResendTickets, invoiceStatus !== "Cancelled"),
    canEditBuyer: actionAllowance(
      raw.CanEditBuyer ?? raw.canEditBuyer,
      BUYER_EDITABLE_STATUSES.includes(invoiceStatus),
    ),
    canEdit: actionAllowance(raw.CanEdit ?? raw.canEdit, invoiceType === "Custom" && invoiceStatus === "PendingPayment"),
    canPayOnline: actionAllowance(
      raw.CanPayOnline ?? raw.canPayOnline,
      invoiceType === "Custom" && invoiceStatus === "PendingPayment",
    ),
    linkedInvoice: normalizeLinkedInvoice(raw.LinkedInvoice ?? raw.linkedInvoice),
  }
}

function toPage<S, T>(
  parsed: z.infer<ReturnType<typeof pageSchema>>,
  normalize: (item: S) => T,
  pageNo: number,
  pageSize: number,
): Page<T> {
  const rawItems = (parsed.PageData ?? parsed.pageData ?? []) as S[]
  const items = rawItems.map(normalize)
  return {
    items,
    total: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? items.length,
    page: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    totalPages: parsed.PageCount ?? parsed.pageCount ?? 0,
  }
}

function appendArrayParams(params: URLSearchParams, key: string, values: string[]) {
  values.forEach((value) => params.append(key, value))
}

export async function fetchEventInvoices(
  filters: EventInvoiceFilters,
  pageNo: number,
  pageSize: number,
  sortBy: EventInvoiceSortBy,
  sortOrder: EventInvoiceSortOrder,
): Promise<Page<EventInvoiceListItem>> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))
  params.set("sortBy", sortBy)
  params.set("sortOrder", sortOrder)

  appendArrayParams(params, "eventUniqueIds", filters.eventUniqueIds)
  appendArrayParams(params, "sessionUniqueIds", filters.sessionUniqueIds)
  appendArrayParams(params, "statuses", filters.statuses)
  appendArrayParams(params, "paymentMethods", filters.paymentMethods)
  appendArrayParams(params, "invoiceTypes", filters.invoiceTypes)

  if (filters.overdueOnly) {
    params.set("overdueOnly", "true")
  }

  // The picker gives a calendar date in the organizer's own zone; the API filters on UTC instants, so a
  // late-evening purchase would otherwise land on the next UTC day and fall outside the chosen range.
  const from = filters.invoiceDateFrom ? startOfLocalDayAsUtcIso(filters.invoiceDateFrom) : null
  const to = filters.invoiceDateTo ? endOfLocalDayAsUtcIso(filters.invoiceDateTo) : null

  if (from) {
    params.set("invoiceDateFrom", from)
  }
  if (to) {
    params.set("invoiceDateTo", to)
  }
  if (filters.searchTerm.trim()) {
    params.set("searchTerm", filters.searchTerm.trim())
  }

  const response = await client.get<unknown>(API_ROUTES.eventInvoices, { params })
  const parsed = pageSchema(listItemSchema).parse(parseServicePayload(response.data))
  return toPage(parsed, normalizeListItem, pageNo, pageSize)
}

export async function fetchEventInvoiceFilterOptions(): Promise<EventInvoiceFilterOptions> {
  const response = await client.get<unknown>(API_ROUTES.eventInvoiceFilterOptions)
  const parsed = filterOptionsSchema.parse(parseServicePayload(response.data))

  const events = (parsed.Events ?? parsed.events ?? []).map((raw) => ({
    uniqueId: raw.Value ?? raw.value ?? "",
    name: raw.Text ?? raw.text ?? "",
  }))

  const sessions = (parsed.Sessions ?? parsed.sessions ?? []).map((raw) => ({
    uniqueId: raw.UniqueId ?? raw.uniqueId ?? "",
    name: raw.Name ?? raw.name ?? "",
    eventUniqueId: raw.EventUniqueId ?? raw.eventUniqueId ?? "",
  }))

  return { events, sessions }
}

export async function fetchEventInvoiceDetail(invoiceUniqueId: string): Promise<EventInvoiceDetail> {
  const response = await client.get<unknown>(API_ROUTES.eventInvoiceDetail(invoiceUniqueId))
  const parsed = detailSchema.parse(parseServicePayload(response.data))
  return normalizeDetail(parsed)
}

export async function resendEventInvoice(invoiceUniqueId: string): Promise<void> {
  await client.post(API_ROUTES.eventInvoiceResend(invoiceUniqueId))
}

export async function resendEventInvoiceTicket(invoiceUniqueId: string, ticketUniqueId: string): Promise<void> {
  await client.post(API_ROUTES.eventInvoiceTicketResend(invoiceUniqueId, ticketUniqueId))
}

export async function markEventInvoiceAsPaid(invoiceUniqueId: string): Promise<void> {
  await client.post(API_ROUTES.eventInvoiceMarkPaid(invoiceUniqueId))
}

export async function cancelEventInvoice(invoiceUniqueId: string, cancellationNotes: string): Promise<void> {
  await client.post(API_ROUTES.eventInvoiceCancel(invoiceUniqueId), { note: cancellationNotes.trim() })
}

export interface EventInvoiceBuyerUpdate {
  buyerName: string
  buyerEmail: string
  buyerPhone: string | null
}

export async function updateEventInvoiceBuyer(
  invoiceUniqueId: string,
  buyer: EventInvoiceBuyerUpdate,
): Promise<void> {
  await client.put(API_ROUTES.eventInvoiceBuyer(invoiceUniqueId), buyer)
}

export async function addEventInvoiceNote(invoiceUniqueId: string, note: string): Promise<void> {
  await client.post(API_ROUTES.eventInvoiceAddNote(invoiceUniqueId), { note: note.trim() })
}

export interface EventInvoiceAttendeeUpdate {
  name: string
  email: string | null
  phone: string | null
}

export async function updateEventInvoiceAttendee(
  invoiceUniqueId: string,
  lineItemUniqueId: string,
  slotIndex: number,
  data: EventInvoiceAttendeeUpdate,
): Promise<void> {
  await client.put(API_ROUTES.eventInvoiceLineItemAttendee(invoiceUniqueId, lineItemUniqueId, slotIndex), data)
}

export interface CreateEventCustomInvoicePayload {
  eventUniqueId: string
  categoryUniqueId: string
  dueDateUtc: string
  memberUniqueId?: string | null
  contactUniqueId?: string | null
  companyName: string
  firstName?: string
  middleName?: string
  lastName: string
  cellPhone?: string
  email: string
  specialNotes?: string
  /** Amounts stay decimal strings the whole way to the server - never float. */
  lineItems: { description: string; amount: string }[]
}

/** An update carries the same shape as a create; the invoice it targets is named in the URL. */
export type UpdateEventCustomInvoicePayload = CreateEventCustomInvoicePayload

export async function updateEventCustomInvoice(
  invoiceUniqueId: string,
  payload: UpdateEventCustomInvoicePayload,
): Promise<void> {
  await client.put(API_ROUTES.eventInvoiceCustomUpdate(invoiceUniqueId), payload)
}

export async function linkEventInvoice(invoiceUniqueId: string, targetInvoiceUniqueId: string): Promise<void> {
  await client.post(API_ROUTES.eventInvoiceCustomLink(invoiceUniqueId), { targetInvoiceUniqueId })
}

export async function unlinkEventInvoice(invoiceUniqueId: string): Promise<void> {
  await client.delete(API_ROUTES.eventInvoiceCustomLink(invoiceUniqueId))
}

export interface EventCustomInvoiceLineForEdit {
  description: string
  /** Decimal text as the server stored it - never a float. */
  amount: string
}

export interface EventCustomInvoiceForEdit {
  invoiceUniqueId: string
  eventUniqueId: string
  categoryUniqueId: string
  dueDateUtc: string
  companyName: string
  firstName: string
  middleName: string
  lastName: string
  cellPhone: string
  email: string
  specialNotes: string
  invoiceStatus: string
  /** The server's own verdict on whether this invoice may still be edited - a Paid or PartiallyPaid one may not. */
  canEdit: boolean
  lineItems: EventCustomInvoiceLineForEdit[]
}

const forEditLineSchema = z.object({
  Description: dual(z.string()),
  description: dual(z.string()),
  Amount: dual(money()),
  amount: dual(money()),
})

const forEditSchema = z.object({
  InvoiceUniqueId: dual(z.string()),
  invoiceUniqueId: dual(z.string()),
  EventUniqueId: dual(z.string()),
  eventUniqueId: dual(z.string()),
  CategoryUniqueId: dual(z.string()),
  categoryUniqueId: dual(z.string()),
  DueDateUtc: dual(z.string()),
  dueDateUtc: dual(z.string()),
  CompanyName: dual(z.string().nullable()),
  companyName: dual(z.string().nullable()),
  FirstName: dual(z.string().nullable()),
  firstName: dual(z.string().nullable()),
  MiddleName: dual(z.string().nullable()),
  middleName: dual(z.string().nullable()),
  LastName: dual(z.string().nullable()),
  lastName: dual(z.string().nullable()),
  CellPhone: dual(z.string().nullable()),
  cellPhone: dual(z.string().nullable()),
  Email: dual(z.string().nullable()),
  email: dual(z.string().nullable()),
  SpecialNotes: dual(z.string().nullable()),
  specialNotes: dual(z.string().nullable()),
  InvoiceStatus: dual(z.string()),
  invoiceStatus: dual(z.string()),
  CanEdit: dual(z.boolean()),
  canEdit: dual(z.boolean()),
  LineItems: z.array(forEditLineSchema).nullable().optional(),
  lineItems: z.array(forEditLineSchema).nullable().optional(),
})

export async function fetchEventCustomInvoiceForEdit(invoiceUniqueId: string): Promise<EventCustomInvoiceForEdit> {
  const response = await client.get<unknown>(API_ROUTES.eventInvoiceCustomForEdit(invoiceUniqueId))
  const raw = forEditSchema.parse(parseServicePayload(response.data))
  const invoiceStatus = raw.InvoiceStatus ?? raw.invoiceStatus ?? ""

  return {
    invoiceUniqueId: raw.InvoiceUniqueId ?? raw.invoiceUniqueId ?? "",
    eventUniqueId: raw.EventUniqueId ?? raw.eventUniqueId ?? "",
    categoryUniqueId: raw.CategoryUniqueId ?? raw.categoryUniqueId ?? "",
    dueDateUtc: raw.DueDateUtc ?? raw.dueDateUtc ?? "",
    companyName: raw.CompanyName ?? raw.companyName ?? "",
    firstName: raw.FirstName ?? raw.firstName ?? "",
    middleName: raw.MiddleName ?? raw.middleName ?? "",
    lastName: raw.LastName ?? raw.lastName ?? "",
    cellPhone: raw.CellPhone ?? raw.cellPhone ?? "",
    email: raw.Email ?? raw.email ?? "",
    specialNotes: raw.SpecialNotes ?? raw.specialNotes ?? "",
    invoiceStatus,
    // A response predating the flag still has to render a usable page; only PendingPayment admits an edit.
    canEdit: (raw.CanEdit ?? raw.canEdit) ?? invoiceStatus === "PendingPayment",
    lineItems: (raw.LineItems ?? raw.lineItems ?? []).map((line) => ({
      description: line.Description ?? line.description ?? "",
      amount: line.Amount ?? line.amount ?? "0",
    })),
  }
}

export interface EventInvoiceCategoryOption {
  uniqueId: string
  name: string
}

const categoryOptionSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  IsActive: dual(z.boolean()),
  isActive: dual(z.boolean()),
})

/**
 * The sponsorship types a new custom invoice may be billed under: the organizer's categories, narrowed to
 * the active ones. Reuses the Phase 1 categories list endpoint rather than a dedicated options route.
 */
export async function fetchActiveEventInvoiceCategoryOptions(): Promise<EventInvoiceCategoryOption[]> {
  const params = new URLSearchParams({ pageNo: "1", pageSize: "200", sortBy: "displayOrder", sortOrder: "asc" })
  const response = await client.get<unknown>(API_ROUTES.eventInvoiceCategories, { params })
  const parsed = pageSchema(categoryOptionSchema).parse(parseServicePayload(response.data))

  return (parsed.PageData ?? parsed.pageData ?? [])
    .map((raw) => ({
      uniqueId: raw.UniqueId ?? raw.uniqueId ?? "",
      name: raw.Name ?? raw.name ?? "",
      isActive: raw.IsActive ?? raw.isActive ?? true,
    }))
    .filter((option) => option.isActive && option.uniqueId)
    .map(({ uniqueId, name }) => ({ uniqueId, name }))
}

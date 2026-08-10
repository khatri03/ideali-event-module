import { z } from "zod"
import { client } from "@/api/client"
import type { ServiceResponse } from "@/api/types"
import { API_ROUTES } from "@/utils/routes"

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
const money = () => z.coerce.number()

export type EventInvoiceSortBy = "invoiceNo" | "eventName" | "buyerName" | "invoiceStatus" | "invoiceDateUtc" | "totalAmount" | "balanceAmount"
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
  InvoiceDateUtc: dual(z.string()),
  invoiceDateUtc: dual(z.string()),
  TotalAmount: dual(money()),
  totalAmount: dual(money()),
  BalanceAmount: dual(money().nullable()),
  balanceAmount: dual(money().nullable()),
  PaymentMethod: dual(z.string().nullable()),
  paymentMethod: dual(z.string().nullable()),
  CurrencySymbol: dual(z.string()),
  currencySymbol: dual(z.string()),
  TicketCount: dual(integer()),
  ticketCount: dual(integer()),
})

const attendeeSchema = z.object({
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

const detailSchema = z.object({
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
  LineItems: z.array(lineItemSchema).nullable().optional(),
  lineItems: z.array(lineItemSchema).nullable().optional(),
  Payments: z.array(paymentAttemptSchema).nullable().optional(),
  payments: z.array(paymentAttemptSchema).nullable().optional(),
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
  invoiceDateUtc: string
  totalAmount: number
  balanceAmount: number | null
  paymentMethod: string | null
  currencySymbol: string
  ticketCount: number
}

export interface EventInvoiceAttendee {
  name: string
  email: string | null
  phone: string | null
}

export interface EventInvoiceTicket {
  ticketUniqueId: string
  ticketCode: string
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
  unitPrice: number
  lineTotal: number
  attendees: EventInvoiceAttendee[]
  tickets: EventInvoiceTicket[]
}

export interface EventInvoicePaymentAttempt {
  paymentMethod: string
  paymentStatus: string
  paymentStatusLabel: string
  amount: number
  referenceNo: string | null
  errorMessage: string | null
  paymentDateUtc: string
}

export interface EventInvoiceDetail {
  invoiceUniqueId: string
  invoiceNo: string
  invoiceStatus: string
  invoiceStatusLabel: string
  invoiceDateUtc: string
  subTotal: number
  discountAmount: number | null
  discountCouponCode: string | null
  taxAmount: number | null
  serviceCharges: number | null
  totalAmount: number
  balanceAmount: number | null
  currencySymbol: string
  eventUniqueId: string
  eventName: string
  buyerName: string
  buyerEmail: string | null
  buyerPhone: string | null
  lineItems: EventInvoiceLineItem[]
  payments: EventInvoicePaymentAttempt[]
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

/** The API sends the display text alongside the enum name; older responses may not, so fall back to it. */
function statusLabelOr(label: string | undefined, rawStatus: string) {
  return label?.trim() ? label : rawStatus
}

function normalizeListItem(raw: z.infer<typeof listItemSchema>): EventInvoiceListItem {
  const invoiceStatus = raw.InvoiceStatus ?? raw.invoiceStatus ?? ""

  return {
    invoiceUniqueId: raw.InvoiceUniqueId ?? raw.invoiceUniqueId ?? "",
    invoiceNo: raw.InvoiceNo ?? raw.invoiceNo ?? "",
    eventUniqueId: raw.EventUniqueId ?? raw.eventUniqueId ?? "",
    eventName: raw.EventName ?? raw.eventName ?? "",
    buyerName: raw.BuyerName ?? raw.buyerName ?? "",
    buyerEmail: raw.BuyerEmail ?? raw.buyerEmail ?? null,
    invoiceStatus,
    invoiceStatusLabel: statusLabelOr(raw.InvoiceStatusLabel ?? raw.invoiceStatusLabel, invoiceStatus),
    invoiceDateUtc: raw.InvoiceDateUtc ?? raw.invoiceDateUtc ?? "",
    totalAmount: raw.TotalAmount ?? raw.totalAmount ?? 0,
    balanceAmount: raw.BalanceAmount ?? raw.balanceAmount ?? null,
    paymentMethod: raw.PaymentMethod ?? raw.paymentMethod ?? null,
    currencySymbol: raw.CurrencySymbol ?? raw.currencySymbol ?? "$",
    ticketCount: raw.TicketCount ?? raw.ticketCount ?? 0,
  }
}

function normalizeAttendee(raw: z.infer<typeof attendeeSchema>): EventInvoiceAttendee {
  return {
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
    unitPrice: raw.UnitPrice ?? raw.unitPrice ?? 0,
    lineTotal: raw.LineTotal ?? raw.lineTotal ?? 0,
    attendees: (raw.Attendees ?? raw.attendees ?? []).map(normalizeAttendee),
    tickets: (raw.Tickets ?? raw.tickets ?? []).map(normalizeTicket),
  }
}

function normalizePaymentAttempt(raw: z.infer<typeof paymentAttemptSchema>): EventInvoicePaymentAttempt {
  const paymentStatus = raw.PaymentStatus ?? raw.paymentStatus ?? ""

  return {
    paymentMethod: raw.PaymentMethod ?? raw.paymentMethod ?? "",
    paymentStatus,
    paymentStatusLabel: statusLabelOr(raw.PaymentStatusLabel ?? raw.paymentStatusLabel, paymentStatus),
    amount: raw.Amount ?? raw.amount ?? 0,
    referenceNo: raw.ReferenceNo ?? raw.referenceNo ?? null,
    errorMessage: raw.ErrorMessage ?? raw.errorMessage ?? null,
    paymentDateUtc: raw.PaymentDateUtc ?? raw.paymentDateUtc ?? "",
  }
}

function normalizeDetail(raw: z.infer<typeof detailSchema>): EventInvoiceDetail {
  const invoiceStatus = raw.InvoiceStatus ?? raw.invoiceStatus ?? ""

  return {
    invoiceUniqueId: raw.InvoiceUniqueId ?? raw.invoiceUniqueId ?? "",
    invoiceNo: raw.InvoiceNo ?? raw.invoiceNo ?? "",
    invoiceStatus,
    invoiceStatusLabel: statusLabelOr(raw.InvoiceStatusLabel ?? raw.invoiceStatusLabel, invoiceStatus),
    invoiceDateUtc: raw.InvoiceDateUtc ?? raw.invoiceDateUtc ?? "",
    subTotal: raw.SubTotal ?? raw.subTotal ?? 0,
    discountAmount: raw.DiscountAmount ?? raw.discountAmount ?? null,
    discountCouponCode: raw.DiscountCouponCode ?? raw.discountCouponCode ?? null,
    taxAmount: raw.TaxAmount ?? raw.taxAmount ?? null,
    serviceCharges: raw.ServiceCharges ?? raw.serviceCharges ?? null,
    totalAmount: raw.TotalAmount ?? raw.totalAmount ?? 0,
    balanceAmount: raw.BalanceAmount ?? raw.balanceAmount ?? null,
    currencySymbol: raw.CurrencySymbol ?? raw.currencySymbol ?? "$",
    eventUniqueId: raw.EventUniqueId ?? raw.eventUniqueId ?? "",
    eventName: raw.EventName ?? raw.eventName ?? "",
    buyerName: raw.BuyerName ?? raw.buyerName ?? "",
    buyerEmail: raw.BuyerEmail ?? raw.buyerEmail ?? null,
    buyerPhone: raw.BuyerPhone ?? raw.buyerPhone ?? null,
    lineItems: (raw.LineItems ?? raw.lineItems ?? []).map(normalizeLineItem),
    payments: (raw.Payments ?? raw.payments ?? []).map(normalizePaymentAttempt),
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

  if (filters.invoiceDateFrom) {
    params.set("invoiceDateFrom", filters.invoiceDateFrom)
  }
  if (filters.invoiceDateTo) {
    params.set("invoiceDateTo", filters.invoiceDateTo)
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

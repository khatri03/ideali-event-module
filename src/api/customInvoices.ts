import { z } from "zod"
import { client } from "@/api/client"
import {
  invoiceNoteSchema,
  normalizeInvoiceNote,
  normalizePaymentAttempt,
  paymentAttemptSchema,
  type EventInvoiceNote,
  type EventInvoicePaymentAttempt,
} from "@/api/eventInvoices"
import { parseServicePayload } from "@/api/serviceResponse"
import { API_ROUTES } from "@/utils/routes"

const CUSTOM_INVOICE_MODULES = ["Event", "Membership", "Donation"] as const

/** The modules a custom invoice can bill a record of. */
export type CustomInvoiceModule = (typeof CUSTOM_INVOICE_MODULES)[number]

/** The body of both create and update; on update the invoice is named in the URL. */
export interface CustomInvoiceWritePayload {
  moduleType: CustomInvoiceModule
  /** The public id of the billed record within `moduleType`. Fixed at creation; an update repeats it. */
  entityUniqueId: string
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

export interface CustomInvoiceLineForEdit {
  description: string
  /** Decimal text as the server stored it - never a float. */
  amount: string
}

export interface CustomInvoiceForEdit {
  invoiceUniqueId: string
  moduleType: CustomInvoiceModule
  /** The billed record, or empty when it no longer exists. */
  entityUniqueId: string
  entityName: string
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
  lineItems: CustomInvoiceLineForEdit[]
}

export interface CustomInvoiceLineItem {
  invoiceItemUniqueId: string
  description: string
  /** Decimal text as the server wrote it - sum with `sumMoney`, format with `formatCurrency`, never float. */
  amount: string
}

/** The other half of a reciprocal link - enough to name the linked invoice and open it. */
export interface LinkedInvoiceReference {
  invoiceUniqueId: string
  invoiceNo: string
  invoiceStatusLabel: string
}

export interface CustomInvoiceDetail {
  invoiceUniqueId: string
  invoiceNo: string
  invoiceStatus: string
  invoiceStatusLabel: string
  invoiceDateUtc: string
  moduleType: CustomInvoiceModule
  /** The billed record, or null when it no longer exists. */
  entityUniqueId: string | null
  entityName: string | null
  categoryName: string
  dueDateUtc: string
  /** The server's verdict that this invoice is unpaid and past due - rendered as-is, never re-derived here. */
  isOverdue: boolean
  specialNotes: string | null
  companyName: string
  buyerFirstName: string | null
  buyerMiddleName: string | null
  buyerLastName: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string | null
  /** Decimal text as the server wrote it - format with `formatCurrency`, never with float arithmetic. */
  subTotal: string
  totalAmount: string
  balanceAmount: string | null
  currencySymbol: string
  lineItems: CustomInvoiceLineItem[]
  linkedInvoice: LinkedInvoiceReference | null
  notes: EventInvoiceNote[]
  payments: EventInvoicePaymentAttempt[]
  /** Server-decided action gates; the page renders these, never inferring an action from the role. */
  canEdit: boolean
  canMarkAsPaid: boolean
  canCancel: boolean
  canPayOnline: boolean
  canSend: boolean
}

export interface InvoiceCategoryOption {
  uniqueId: string
  name: string
}

const money = () => z.coerce.string()
const flag = () => z.boolean().nullish().transform((value) => value ?? false)
const text = () => z.string().nullish().transform((value) => value ?? "")

// The endpoint answers with the bare Guid, or an object carrying it, depending on how it wraps the result.
const createdInvoiceIdSchema = z.union([
  z.string().min(1),
  z.object({ invoiceUniqueId: z.string().min(1) }).transform((created) => created.invoiceUniqueId),
])

const forEditSchema = z.object({
  invoiceUniqueId: z.string().min(1),
  moduleType: z.enum(CUSTOM_INVOICE_MODULES),
  entityUniqueId: text(),
  entityName: text(),
  categoryUniqueId: text(),
  dueDateUtc: text(),
  companyName: text(),
  firstName: text(),
  middleName: text(),
  lastName: text(),
  cellPhone: text(),
  email: text(),
  specialNotes: text(),
  invoiceStatus: z.string(),
  canEdit: flag(),
  lineItems: z
    .array(z.object({ description: text(), amount: money() }))
    .nullish()
    .transform((lines) => lines ?? []),
})

const linkedInvoiceSchema = z
  .object({ invoiceUniqueId: z.string().min(1), invoiceNo: text(), invoiceStatusLabel: text() })
  .nullish()
  .transform((linked) => linked ?? null)

const detailSchema = z.object({
  invoiceUniqueId: z.string().min(1),
  invoiceNo: z.string(),
  invoiceStatus: z.string(),
  invoiceStatusLabel: text(),
  invoiceDateUtc: text(),
  moduleType: z.enum(CUSTOM_INVOICE_MODULES),
  entityUniqueId: z.string().nullish().transform((value) => value ?? null),
  entityName: z.string().nullish().transform((value) => value ?? null),
  categoryName: text(),
  dueDateUtc: text(),
  isOverdue: flag(),
  specialNotes: z.string().nullish().transform((value) => value ?? null),
  companyName: text(),
  buyerFirstName: z.string().nullish().transform((value) => value ?? null),
  buyerMiddleName: z.string().nullish().transform((value) => value ?? null),
  buyerLastName: text(),
  buyerName: text(),
  buyerEmail: text(),
  buyerPhone: z.string().nullish().transform((value) => value ?? null),
  subTotal: money(),
  totalAmount: money(),
  balanceAmount: money().nullish().transform((value) => value ?? null),
  currencySymbol: z.string().nullish().transform((value) => value || "$"),
  lineItems: z
    .array(z.object({ invoiceItemUniqueId: text(), description: text(), amount: money() }))
    .nullish()
    .transform((lines) => lines ?? []),
  linkedInvoice: linkedInvoiceSchema,
  notes: z.array(invoiceNoteSchema).nullish().transform((notes) => (notes ?? []).map(normalizeInvoiceNote)),
  payments: z
    .array(paymentAttemptSchema)
    .nullish()
    .transform((payments) => (payments ?? []).map(normalizePaymentAttempt)),
  canEdit: flag(),
  canMarkAsPaid: flag(),
  canCancel: flag(),
  canPayOnline: flag(),
  canSend: flag(),
})

const categoryOptionsPageSchema = z.object({
  pageData: z
    .array(z.object({ uniqueId: text(), name: text(), isActive: z.boolean().nullish() }))
    .nullish()
    .transform((rows) => rows ?? []),
})

export async function createCustomInvoice(payload: CustomInvoiceWritePayload): Promise<string> {
  const response = await client.post<unknown>(API_ROUTES.customInvoiceCreate, payload)
  return createdInvoiceIdSchema.parse(parseServicePayload(response.data))
}

/** The server refuses a moduleType or entityUniqueId that differs from the stored binding. */
export async function updateCustomInvoice(invoiceUniqueId: string, payload: CustomInvoiceWritePayload): Promise<void> {
  await client.put(API_ROUTES.customInvoiceUpdate(invoiceUniqueId), payload)
}

export async function fetchCustomInvoiceForEdit(invoiceUniqueId: string): Promise<CustomInvoiceForEdit> {
  const response = await client.get<unknown>(API_ROUTES.customInvoiceForEdit(invoiceUniqueId))
  return forEditSchema.parse(parseServicePayload(response.data))
}

export async function fetchCustomInvoiceDetail(invoiceUniqueId: string): Promise<CustomInvoiceDetail> {
  const response = await client.get<unknown>(API_ROUTES.customInvoiceDetail(invoiceUniqueId))
  const detail = detailSchema.parse(parseServicePayload(response.data))
  return { ...detail, invoiceStatusLabel: detail.invoiceStatusLabel || detail.invoiceStatus }
}

export async function linkCustomInvoice(invoiceUniqueId: string, targetInvoiceUniqueId: string): Promise<void> {
  await client.post(API_ROUTES.customInvoiceLink(invoiceUniqueId), { targetInvoiceUniqueId })
}

export async function unlinkCustomInvoice(invoiceUniqueId: string): Promise<void> {
  await client.delete(API_ROUTES.customInvoiceLink(invoiceUniqueId))
}

export async function markCustomInvoiceAsPaid(invoiceUniqueId: string): Promise<void> {
  await client.post(API_ROUTES.customInvoiceMarkPaid(invoiceUniqueId))
}

export async function cancelCustomInvoice(invoiceUniqueId: string, cancellationNotes: string): Promise<void> {
  await client.post(API_ROUTES.customInvoiceCancel(invoiceUniqueId), { note: cancellationNotes.trim() })
}

export async function sendCustomInvoice(invoiceUniqueId: string): Promise<void> {
  await client.post(API_ROUTES.customInvoiceSend(invoiceUniqueId))
}

export async function addCustomInvoiceNote(invoiceUniqueId: string, note: string): Promise<void> {
  await client.post(API_ROUTES.customInvoiceAddNote(invoiceUniqueId), { note: note.trim() })
}

/**
 * The sponsorship types a new custom invoice may be billed under: the organizer's categories, narrowed to
 * the active ones. Reuses the categories list endpoint rather than a dedicated options route.
 */
export async function fetchActiveInvoiceCategoryOptions(): Promise<InvoiceCategoryOption[]> {
  const params = new URLSearchParams({ pageNo: "1", pageSize: "200", sortBy: "displayOrder", sortOrder: "asc" })
  const response = await client.get<unknown>(API_ROUTES.invoiceCategories, { params })
  const { pageData } = categoryOptionsPageSchema.parse(parseServicePayload(response.data))

  return pageData
    .filter((option) => (option.isActive ?? true) && option.uniqueId)
    .map(({ uniqueId, name }) => ({ uniqueId, name }))
}

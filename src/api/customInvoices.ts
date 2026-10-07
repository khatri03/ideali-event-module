import { z } from "zod"
import { client } from "@/api/client"
import {
  appendArrayParams,
  invoiceNoteSchema,
  normalizeInvoiceNote,
  normalizePaymentAttempt,
  pageSchema,
  paymentAttemptSchema,
  toPage,
  type EventInvoiceNote,
  type EventInvoicePaymentAttempt,
  type Page,
} from "@/api/eventInvoices"
import { parseServicePayload } from "@/api/serviceResponse"
import { API_ROUTES } from "@/utils/routes"

export const CUSTOM_INVOICE_MODULES = ["Event", "Membership", "Donation"] as const

/** The modules a custom invoice can bill a record of. */
export type CustomInvoiceModule = (typeof CUSTOM_INVOICE_MODULES)[number]

/** Overdue is derived on the server (awaiting payment and past due), so it never overlaps Pending Payment. */
export const CUSTOM_INVOICE_LIST_STATUSES = ["Paid", "PendingPayment", "Overdue", "Cancelled"] as const

export type CustomInvoiceListStatus = (typeof CUSTOM_INVOICE_LIST_STATUSES)[number]

export const CUSTOM_INVOICE_LIST_STATUS_LABELS: Record<CustomInvoiceListStatus, string> = {
  Paid: "Paid",
  PendingPayment: "Pending Payment",
  Overdue: "Overdue",
  Cancelled: "Cancelled",
}

export interface CustomInvoiceListQuery {
  moduleType?: CustomInvoiceModule
  categoryUniqueId?: string
  /** Empty means every status. */
  statuses: CustomInvoiceListStatus[]
  searchTerm: string
  page: number
  pageSize: number
}

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
  /** The same-module invoice this one is linked to. On update null clears an existing link. */
  linkedInvoiceUniqueId?: string | null
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
  /** When the buyer was last emailed this invoice, or null when it has never been sent. */
  lastSentAtUtc: string | null
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

/** One server page per request; the entity dropdown never asks for the whole set. */
export const ENTITY_OPTIONS_PAGE_SIZE = 20

/** A record of the chosen module the organizer owns and can bill. */
export interface CustomInvoiceEntityOption {
  uniqueId: string
  name: string
}

export interface CustomInvoiceEntityOptionsPage {
  items: CustomInvoiceEntityOption[]
  pageNo: number
  pageCount: number
  total: number
}

export interface CustomInvoiceEntityOptionsQuery {
  moduleType: CustomInvoiceModule
  searchTerm: string
  pageNo: number
  pageSize?: number
}

/** A custom invoice of the same module the organizer may link to, with the buyer it would copy. */
export interface CustomInvoiceLinkCandidate {
  invoiceUniqueId: string
  invoiceNo: string
  companyName: string
  buyerFirstName: string | null
  buyerMiddleName: string | null
  buyerLastName: string
  buyerName: string
  buyerEmail: string
  invoiceDateUtc: string
  invoiceStatus: string
  invoiceStatusLabel: string
}

export interface CustomInvoiceLinkCandidatesPage {
  items: CustomInvoiceLinkCandidate[]
  total: number
  totalPages: number
}

export interface CustomInvoiceLinkCandidatesQuery {
  moduleType: CustomInvoiceModule
  searchTerm: string
  pageNo: number
  pageSize: number
  /** The invoice being linked from, which the server leaves out of its own candidates. */
  excludeInvoiceUniqueId?: string
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
  lastSentAtUtc: z.string().nullish().transform((value) => value || null),
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

const enabledModulesSchema = z.array(z.enum(CUSTOM_INVOICE_MODULES))

const entityOptionsPageSchema = z.object({
  pageNo: z.number().int(),
  pageCount: z.number().int(),
  totalRecordsCount: z.number().int(),
  pageData: z.array(z.object({ uniqueId: z.string().min(1), name: z.string() })),
})

const nullableText = () => z.string().nullish().transform((value) => value ?? null)

const linkCandidatesPageSchema = z.object({
  pageCount: z.number().int(),
  totalRecordsCount: z.number().int(),
  pageData: z.array(
    z.object({
      invoiceUniqueId: z.string().min(1),
      invoiceNo: z.string(),
      companyName: text(),
      buyerFirstName: nullableText(),
      buyerMiddleName: nullableText(),
      buyerLastName: text(),
      buyerName: text(),
      buyerEmail: text(),
      invoiceDateUtc: text(),
      invoiceStatus: z.string(),
      invoiceStatusLabel: text(),
    }),
  ),
})

const listRowSchema = z
  .object({
    invoiceUniqueId: z.string().min(1),
    invoiceNo: z.string(),
    moduleType: z.enum(CUSTOM_INVOICE_MODULES),
    /** Empty when the billed record no longer exists. */
    entityName: text(),
    companyName: text(),
    buyerName: text(),
    buyerEmail: text(),
    categoryName: text(),
    dueDateUtc: text(),
    invoiceDateUtc: text(),
    totalAmount: money(),
    currencySymbol: z.string().nullish().transform((value) => value || "$"),
    invoiceStatus: z.string(),
    isOverdue: flag(),
    statusLabel: text(),
    canMarkAsPaid: flag(),
    canCancel: flag(),
    canSend: flag(),
  })
  .transform((row) => ({ ...row, statusLabel: row.statusLabel || row.invoiceStatus }))

/** One row of the cross-module custom invoice list; amounts are decimal text, never float. */
export type CustomInvoiceListItem = z.infer<typeof listRowSchema>

// A module this client does not know yet is dropped from the filter rather than failing the whole list.
const listFilterOptionsSchema = z.object({
  moduleTypes: z
    .array(z.string())
    .nullish()
    .transform((modules) => CUSTOM_INVOICE_MODULES.filter((moduleType) => (modules ?? []).includes(moduleType))),
  categories: z
    .array(z.object({ uniqueId: z.string().min(1), name: z.string(), isActive: flag() }))
    .nullish()
    .transform((categories) => categories ?? []),
})

/** The modules that have invoices and every category, including inactive ones still on old invoices. */
export type CustomInvoiceListFilterOptions = z.infer<typeof listFilterOptionsSchema>

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

/** The modules the platform admin has turned custom invoicing on for, in module order. */
export async function fetchEnabledCustomInvoiceModules(): Promise<CustomInvoiceModule[]> {
  const response = await client.get<unknown>(API_ROUTES.customInvoiceEnabledModules)
  return enabledModulesSchema.parse(parseServicePayload(response.data))
}

/** One page of the organizer's own records in a module, narrowed by name on the server. */
export async function fetchCustomInvoiceEntityOptions({
  moduleType,
  searchTerm,
  pageNo,
  pageSize = ENTITY_OPTIONS_PAGE_SIZE,
}: CustomInvoiceEntityOptionsQuery): Promise<CustomInvoiceEntityOptionsPage> {
  const params = new URLSearchParams({
    moduleType,
    searchTerm: searchTerm.trim(),
    pageNo: String(pageNo),
    pageSize: String(pageSize),
  })
  const response = await client.get<unknown>(API_ROUTES.customInvoiceEntityOptions, { params })
  const page = entityOptionsPageSchema.parse(parseServicePayload(response.data))
  return { items: page.pageData, pageNo: page.pageNo, pageCount: page.pageCount, total: page.totalRecordsCount }
}

/** One page of the organizer's custom invoices in a module that an invoice may be linked to, searched on the server. */
export async function fetchCustomInvoiceLinkCandidates({
  moduleType,
  searchTerm,
  pageNo,
  pageSize,
  excludeInvoiceUniqueId,
}: CustomInvoiceLinkCandidatesQuery): Promise<CustomInvoiceLinkCandidatesPage> {
  const params = new URLSearchParams({
    moduleType,
    searchTerm: searchTerm.trim(),
    pageNo: String(pageNo),
    pageSize: String(pageSize),
  })
  if (excludeInvoiceUniqueId) params.set("excludeInvoiceUniqueId", excludeInvoiceUniqueId)
  const response = await client.get<unknown>(API_ROUTES.customInvoiceLinkCandidates, { params })
  const page = linkCandidatesPageSchema.parse(parseServicePayload(response.data))
  return {
    items: page.pageData.map((row) => ({ ...row, invoiceStatusLabel: row.invoiceStatusLabel || row.invoiceStatus })),
    total: page.totalRecordsCount,
    totalPages: page.pageCount,
  }
}

/** One page of the organizer's custom invoices across modules, filtered, counted and paged on the server. */
export async function fetchCustomInvoiceList(query: CustomInvoiceListQuery): Promise<Page<CustomInvoiceListItem>> {
  const params = new URLSearchParams({ pageNo: String(query.page), pageSize: String(query.pageSize) })
  if (query.moduleType) params.set("moduleType", query.moduleType)
  if (query.categoryUniqueId) params.set("categoryUniqueId", query.categoryUniqueId)
  appendArrayParams(params, "statuses", query.statuses)
  const searchTerm = query.searchTerm.trim()
  if (searchTerm) params.set("searchTerm", searchTerm)

  const response = await client.get<unknown>(API_ROUTES.customInvoiceList, { params })
  const parsed = pageSchema(listRowSchema).parse(parseServicePayload(response.data))
  return toPage(parsed, (row: CustomInvoiceListItem) => row, query.page, query.pageSize)
}

export async function fetchCustomInvoiceListFilterOptions(): Promise<CustomInvoiceListFilterOptions> {
  const response = await client.get<unknown>(API_ROUTES.customInvoiceListFilterOptions)
  return listFilterOptionsSchema.parse(parseServicePayload(response.data))
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

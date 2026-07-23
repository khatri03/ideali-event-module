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

/** Backend enums serialize as strings. Kept as plain unions to avoid drift. */
export type AlertPriority = "Urgent" | "Important" | "Normal" | "Low"
export type AlertStatus =
  | "Draft"
  | "Scheduled"
  | "Sending"
  | "Sent"
  | "PartiallyFailed"
  | "Failed"
  | "Cancelled"
export type AlertDeliveryStatus = "Pending" | "Sent" | "Failed" | "Skipped"
export type AlertChannel = "Instant" | "Email"
export type AlertSortBy = "title" | "status" | "priority" | "recipientCount" | "sentAtUtc"
export type AlertSortOrder = "asc" | "desc"

const dual = <T extends z.ZodTypeAny>(schema: T) => schema.optional()

const alertSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Title: dual(z.string()),
  title: dual(z.string()),
  Priority: dual(z.string()),
  priority: dual(z.string()),
  Channels: dual(z.number().int()),
  channels: dual(z.number().int()),
  Status: dual(z.string()),
  status: dual(z.string()),
  ScheduledAtUtc: dual(z.string().nullable()),
  scheduledAtUtc: dual(z.string().nullable()),
  SentAtUtc: dual(z.string().nullable()),
  sentAtUtc: dual(z.string().nullable()),
  RecipientCount: dual(z.number().int()),
  recipientCount: dual(z.number().int()),
  ReadCount: dual(z.number().int()),
  readCount: dual(z.number().int()),
  FailedCount: dual(z.number().int()),
  failedCount: dual(z.number().int()),
  CreatedBy: dual(z.string()),
  createdBy: dual(z.string()),
  CreatedOnUtc: dual(z.string()),
  createdOnUtc: dual(z.string()),
  Body: dual(z.string()),
  body: dual(z.string()),
})

const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    PageNo: dual(z.number().int()),
    pageNo: dual(z.number().int()),
    PageSize: dual(z.number().int()),
    pageSize: dual(z.number().int()),
    PageCount: dual(z.number().int()),
    pageCount: dual(z.number().int()),
    TotalRecordsCount: dual(z.number().int()),
    totalRecordsCount: dual(z.number().int()),
    PageData: z.array(item).optional(),
    pageData: z.array(item).optional(),
  })

const recipientOptionSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  Email: dual(z.string().nullable()),
  email: dual(z.string().nullable()),
})

const emailEventSchema = z.object({
  EventType: dual(z.string()),
  eventType: dual(z.string()),
  OccurredAtUtc: dual(z.string()),
  occurredAtUtc: dual(z.string()),
})

const deliverySchema = z.object({
  Channel: dual(z.string()),
  channel: dual(z.string()),
  AttemptNo: dual(z.number().int()),
  attemptNo: dual(z.number().int()),
  Status: dual(z.string()),
  status: dual(z.string()),
  ToEmail: dual(z.string().nullable()),
  toEmail: dual(z.string().nullable()),
  FailureReason: dual(z.string().nullable()),
  failureReason: dual(z.string().nullable()),
  SentAtUtc: dual(z.string().nullable()),
  sentAtUtc: dual(z.string().nullable()),
  EmailEvents: z.array(emailEventSchema).nullable().optional(),
  emailEvents: z.array(emailEventSchema).nullable().optional(),
})

const recipientSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  Email: dual(z.string().nullable()),
  email: dual(z.string().nullable()),
  IsRead: dual(z.boolean()),
  isRead: dual(z.boolean()),
  ReadAtUtc: dual(z.string().nullable()),
  readAtUtc: dual(z.string().nullable()),
  InstantDeliveredAtUtc: dual(z.string().nullable()),
  instantDeliveredAtUtc: dual(z.string().nullable()),
  Deliveries: z.array(deliverySchema).nullable().optional(),
  deliveries: z.array(deliverySchema).nullable().optional(),
})

const inboxSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Title: dual(z.string()),
  title: dual(z.string()),
  Body: dual(z.string()),
  body: dual(z.string()),
  Priority: dual(z.string()),
  priority: dual(z.string()),
  IsRead: dual(z.boolean()),
  isRead: dual(z.boolean()),
  ReadAtUtc: dual(z.string().nullable()),
  readAtUtc: dual(z.string().nullable()),
  SentAtUtc: dual(z.string().nullable()),
  sentAtUtc: dual(z.string().nullable()),
  SentBy: dual(z.string()),
  sentBy: dual(z.string()),
})

export interface AlertListItem {
  uniqueId: string
  title: string
  priority: AlertPriority
  channels: number
  status: AlertStatus
  scheduledAtUtc: string | null
  sentAtUtc: string | null
  recipientCount: number
  readCount: number
  failedCount: number
  createdBy: string
  createdOnUtc: string
}

export interface AlertDetail extends AlertListItem {
  body: string
}

export interface AlertRecipientOption {
  uniqueId: string
  name: string
  email: string | null
}

export interface AlertEmailEvent {
  eventType: string
  occurredAtUtc: string
}

export interface AlertDelivery {
  channel: AlertChannel
  attemptNo: number
  status: AlertDeliveryStatus
  toEmail: string | null
  failureReason: string | null
  sentAtUtc: string | null
  emailEvents: AlertEmailEvent[]
}

export interface AlertRecipient {
  uniqueId: string
  name: string
  email: string | null
  isRead: boolean
  readAtUtc: string | null
  instantDeliveredAtUtc: string | null
  deliveries: AlertDelivery[]
}

export interface InboxAlert {
  uniqueId: string
  title: string
  body: string
  priority: AlertPriority
  isRead: boolean
  readAtUtc: string | null
  sentAtUtc: string | null
  sentBy: string
}

export interface AlertFilters {
  searchTerm: string
  status: AlertStatus | ""
  sortBy: AlertSortBy
  sortOrder: AlertSortOrder
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AlertGroupOption {
  uniqueId: string
  name: string
  memberCount: number
}

export interface CreateAlertPayload {
  title: string
  body: string
  priority: AlertPriority
  channels: number
  scheduledAtUtc: string | null
  recipientUniqueIds: string[]
  memberSearchTerm: string
  membershipTypeUniqueIds: string[]
  membershipStatuses: string[]
  customListUniqueIds: string[]
}

function readResponseData(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload
  }
  if ("Data" in payload) {
    return (payload as { Data?: unknown }).Data
  }
  if ("data" in payload) {
    return (payload as { data?: unknown }).data
  }
  return payload
}

function parseServicePayload(payload: unknown): unknown {
  const response = serviceResponseSchema.parse(payload) as ServiceResponse<unknown> | { Data?: unknown; data?: unknown }
  return readResponseData(response)
}

function assertSuccess(payload: unknown, fallbackMessage: string): void {
  const response = serviceResponseSchema.parse(payload)
  if (response.success === false) {
    throw new Error(response.message ?? fallbackMessage)
  }
}

function pick<T>(upper: T | undefined, lower: T | undefined, fallback: T): T {
  return upper ?? lower ?? fallback
}

function normalizeAlert(item: z.infer<typeof alertSchema>): AlertListItem {
  return {
    uniqueId: pick(item.UniqueId, item.uniqueId, ""),
    title: pick(item.Title, item.title, ""),
    priority: pick(item.Priority, item.priority, "Normal") as AlertPriority,
    channels: pick(item.Channels, item.channels, 0),
    status: pick(item.Status, item.status, "Draft") as AlertStatus,
    scheduledAtUtc: pick(item.ScheduledAtUtc, item.scheduledAtUtc, null),
    sentAtUtc: pick(item.SentAtUtc, item.sentAtUtc, null),
    recipientCount: pick(item.RecipientCount, item.recipientCount, 0),
    readCount: pick(item.ReadCount, item.readCount, 0),
    failedCount: pick(item.FailedCount, item.failedCount, 0),
    createdBy: pick(item.CreatedBy, item.createdBy, ""),
    createdOnUtc: pick(item.CreatedOnUtc, item.createdOnUtc, ""),
  }
}

function normalizeInbox(item: z.infer<typeof inboxSchema>): InboxAlert {
  return {
    uniqueId: pick(item.UniqueId, item.uniqueId, ""),
    title: pick(item.Title, item.title, ""),
    body: pick(item.Body, item.body, ""),
    priority: pick(item.Priority, item.priority, "Normal") as AlertPriority,
    isRead: pick(item.IsRead, item.isRead, false),
    readAtUtc: pick(item.ReadAtUtc, item.readAtUtc, null),
    sentAtUtc: pick(item.SentAtUtc, item.sentAtUtc, null),
    sentBy: pick(item.SentBy, item.sentBy, ""),
  }
}

function normalizeRecipient(item: z.infer<typeof recipientSchema>): AlertRecipient {
  const deliveries = (item.Deliveries ?? item.deliveries ?? []).map((delivery) => ({
    channel: pick(delivery.Channel, delivery.channel, "Email") as AlertChannel,
    attemptNo: pick(delivery.AttemptNo, delivery.attemptNo, 1),
    status: pick(delivery.Status, delivery.status, "Pending") as AlertDeliveryStatus,
    toEmail: pick(delivery.ToEmail, delivery.toEmail, null),
    failureReason: pick(delivery.FailureReason, delivery.failureReason, null),
    sentAtUtc: pick(delivery.SentAtUtc, delivery.sentAtUtc, null),
    emailEvents: (delivery.EmailEvents ?? delivery.emailEvents ?? []).map((emailEvent) => ({
      eventType: pick(emailEvent.EventType, emailEvent.eventType, ""),
      occurredAtUtc: pick(emailEvent.OccurredAtUtc, emailEvent.occurredAtUtc, ""),
    })),
  }))

  return {
    uniqueId: pick(item.UniqueId, item.uniqueId, ""),
    name: pick(item.Name, item.name, ""),
    email: pick(item.Email, item.email, null),
    isRead: pick(item.IsRead, item.isRead, false),
    readAtUtc: pick(item.ReadAtUtc, item.readAtUtc, null),
    instantDeliveredAtUtc: pick(item.InstantDeliveredAtUtc, item.instantDeliveredAtUtc, null),
    deliveries,
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

export async function fetchAlerts(
  filters: AlertFilters,
  pageNo: number,
  pageSize: number,
): Promise<Page<AlertListItem>> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))
  params.set("sortBy", filters.sortBy)
  params.set("sortOrder", filters.sortOrder)
  if (filters.searchTerm.trim()) {
    params.set("searchTerm", filters.searchTerm.trim())
  }
  if (filters.status) {
    params.set("status", filters.status)
  }

  const response = await client.get<unknown>(API_ROUTES.memberAlerts, { params })
  const parsed = pageSchema(alertSchema).parse(parseServicePayload(response.data))
  return toPage(parsed, normalizeAlert, pageNo, pageSize)
}

export async function fetchAlert(uniqueId: string): Promise<AlertDetail> {
  const response = await client.get<unknown>(API_ROUTES.memberAlertDetail(uniqueId))
  const item = alertSchema.parse(parseServicePayload(response.data))
  return {
    ...normalizeAlert(item),
    body: pick(item.Body, item.body, ""),
  }
}

export async function fetchAlertRecipients(
  uniqueId: string,
  searchTerm: string,
  pageNo: number,
  pageSize: number,
): Promise<Page<AlertRecipient>> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))
  if (searchTerm.trim()) {
    params.set("searchTerm", searchTerm.trim())
  }

  const response = await client.get<unknown>(API_ROUTES.memberAlertRecipients(uniqueId), { params })
  const parsed = pageSchema(recipientSchema).parse(parseServicePayload(response.data))
  return toPage(parsed, normalizeRecipient, pageNo, pageSize)
}

export async function fetchAlertRecipientOptions(searchTerm: string): Promise<AlertRecipientOption[]> {
  const trimmed = searchTerm.trim()
  if (trimmed.length < 3) {
    return []
  }

  const params = new URLSearchParams()
  params.set("searchTerm", trimmed)
  params.set("pageNo", "1")
  params.set("pageSize", "20")

  const response = await client.get<unknown>(API_ROUTES.memberAlertRecipientOptions, { params })
  const parsed = pageSchema(recipientOptionSchema).parse(parseServicePayload(response.data))
  return (parsed.PageData ?? parsed.pageData ?? [])
    .map((option) => ({
      uniqueId: pick(option.UniqueId, option.uniqueId, ""),
      name: pick(option.Name, option.name, ""),
      email: pick(option.Email, option.email, null),
    }))
    .filter((option) => option.uniqueId && option.name)
}

const groupOptionSchema = z.object({
  UniqueId: dual(z.string()),
  uniqueId: dual(z.string()),
  Name: dual(z.string()),
  name: dual(z.string()),
  MemberCount: dual(z.number().int()),
  memberCount: dual(z.number().int()),
})

function normalizeGroupOptions(payload: unknown): AlertGroupOption[] {
  const parsed = z.array(groupOptionSchema).parse(parseServicePayload(payload))
  return parsed
    .map((option) => ({
      uniqueId: pick(option.UniqueId, option.uniqueId, ""),
      name: pick(option.Name, option.name, ""),
      memberCount: pick(option.MemberCount, option.memberCount, 0),
    }))
    .filter((option) => option.uniqueId && option.name)
}

export async function fetchMembershipTypeOptions(): Promise<AlertGroupOption[]> {
  const response = await client.get<unknown>(API_ROUTES.memberAlertMembershipTypeOptions)
  return normalizeGroupOptions(response.data)
}

export async function fetchCustomListOptions(): Promise<AlertGroupOption[]> {
  const response = await client.get<unknown>(API_ROUTES.memberAlertCustomListOptions)
  return normalizeGroupOptions(response.data)
}

export async function createAlert(payload: CreateAlertPayload): Promise<string> {
  const response = await client.post<unknown>(API_ROUTES.memberAlertCreate, payload)
  assertSuccess(response.data, "Failed to create alert.")
  const data = parseServicePayload(response.data)
  return typeof data === "string" ? data : ""
}

export async function resendAlert(uniqueId: string): Promise<void> {
  const response = await client.post<unknown>(API_ROUTES.memberAlertResend(uniqueId))
  assertSuccess(response.data, "Failed to resend alert.")
}

export async function deleteAlert(uniqueId: string): Promise<void> {
  const response = await client.delete<unknown>(API_ROUTES.memberAlertDelete(uniqueId))
  assertSuccess(response.data, "Failed to delete alert.")
}

export async function fetchInbox(
  unreadOnly: boolean,
  pageNo: number,
  pageSize: number,
): Promise<Page<InboxAlert>> {
  const params = new URLSearchParams()
  params.set("unreadOnly", String(unreadOnly))
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))

  const response = await client.get<unknown>(API_ROUTES.alertInbox, { params })
  const parsed = pageSchema(inboxSchema).parse(parseServicePayload(response.data))
  return toPage(parsed, normalizeInbox, pageNo, pageSize)
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await client.get<unknown>(API_ROUTES.alertInboxUnreadCount)
  const data = parseServicePayload(response.data)
  return typeof data === "number" ? data : 0
}

export async function markAlertRead(recipientUniqueId: string): Promise<void> {
  const response = await client.post<unknown>(API_ROUTES.alertInboxMarkRead(recipientUniqueId))
  assertSuccess(response.data, "Failed to mark as read.")
}

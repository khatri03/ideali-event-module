import { z } from "zod"
import { client } from "@/api/client"
import type { PaginatedResponse, ServiceResponse } from "@/api/types"
import type { AppEvent, EventCategory, EventStatus, EventVisibility } from "@/types"
import { API_ROUTES } from "@/utils/routes"

export interface EventFilters {
  search?: string
  status?: EventStatus
  category?: EventCategory
}

export interface OrganizerEventListFilters {
  name?: string
  statuses?: string[]
  eventFrom?: string
  eventTo?: string
  venueUniqueIds?: string[]
}

export interface OrganizerEventListItem {
  uniqueId: string
  name: string
  themeColor: string | null
  setupState: string
  isCancelled: boolean
  venueName: string | null
  startDate: string | null
  endDate: string | null
  totalAvailableTickets: number
  ticketsSold: number
}

export type OrganizerEventsPage = PaginatedResponse<OrganizerEventListItem>

const appEventSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    termsConditions: z.string().nullable().optional(),
    bannerUrl: z.string().nullable().optional(),
    discountsEnabled: z.boolean().optional(),
    startDate: z.string(),
    endDate: z.string(),
    location: z.string(),
    category: z.enum(["conference", "workshop", "seminar", "concert", "sports", "networking", "webinar", "hackathon", "other"]),
    status: z.enum(["draft", "published", "ongoing", "completed", "cancelled"]),
    capacity: z.number(),
    attendees: z.number(),
    organizer: z.string(),
    coverColor: z.string(),
    visibility: z.enum(["Public", "Member", "Invitation"]).optional(),
    price: z.number(),
    currency: z.string(),
    tags: z.array(z.string()),
    timeZone: z.string().optional(),
    paymentAccountId: z.string().optional(),
    venueUniqueId: z.string().optional(),
    purchaseTimeLimitMinutes: z.number().int().positive().nullable().optional(),
    purchaseTimeLimitHours: z.number().int().positive().nullable().optional(),
    purchaseTimeLimit: z.number().int().positive().nullable().optional(),
    bookingStartDate: z.string().nullable().optional(),
    bookingEndDate: z.string().nullable().optional(),
    sessions: z
      .array(
        z.object({
          title: z.string(),
          startsAt: z.string(),
          endsAt: z.string(),
        })
      )
      .optional(),
  })
  .transform(({ purchaseTimeLimitMinutes, purchaseTimeLimitHours, purchaseTimeLimit, ...event }) => ({
    ...event,
    purchaseTimeLimitMinutes: purchaseTimeLimitMinutes ?? purchaseTimeLimitHours ?? purchaseTimeLimit ?? null,
  }))

const organizerEventListItemSchema = z.object({
  UniqueId: z.string().min(1).optional(),
  uniqueId: z.string().min(1).optional(),
  Name: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  ThemeColor: z.string().nullable().optional(),
  themeColor: z.string().nullable().optional(),
  SetupState: z.string().min(1).optional(),
  setupState: z.string().min(1).optional(),
  IsCancelled: z.boolean().optional(),
  isCancelled: z.boolean().optional(),
  VenueName: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  StartDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  EndDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  TotalAvailableTickets: z.number().int().optional(),
  totalAvailableTickets: z.number().int().optional(),
  TicketsSold: z.number().int().optional(),
  ticketsSold: z.number().int().optional(),
})

const organizerEventListPageSchema = z.object({
  PageNo: z.number().int().optional(),
  pageNo: z.number().int().optional(),
  PageSize: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  PageCount: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  TotalRecordsCount: z.number().int().optional(),
  totalRecordsCount: z.number().int().optional(),
  PageData: z.array(organizerEventListItemSchema).optional(),
  pageData: z.array(organizerEventListItemSchema).optional(),
})

const eventRegistrationTicketSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  Description: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  ColorCode: z.string().nullable().optional(),
  colorCode: z.string().nullable().optional(),
  FullPrice: z.number().nullable().optional(),
  fullPrice: z.number().nullable().optional(),
  MinPurchase: z.number().int().nullable().optional(),
  minPurchase: z.number().int().nullable().optional(),
  MaxPurchase: z.number().int().nullable().optional(),
  maxPurchase: z.number().int().nullable().optional(),
  TotalQuantity: z.number().int().nullable().optional(),
  totalQuantity: z.number().int().nullable().optional(),
  AvailableForSale: z.number().int().nullable().optional(),
  availableForSale: z.number().int().nullable().optional(),
  TicketsSold: z.number().int().nullable().optional(),
  ticketsSold: z.number().int().nullable().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  SalesStartDateUtc: z.string().nullable().optional(),
  salesStartDateUtc: z.string().nullable().optional(),
  SalesEndDateUtc: z.string().nullable().optional(),
  salesEndDateUtc: z.string().nullable().optional(),
})

const eventRegistrationSessionSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  Description: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  BannerUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  SetupState: z.string().optional(),
  setupState: z.string().optional(),
  BookingStatus: z.string().optional(),
  bookingStatus: z.string().optional(),
  StartDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  EndDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  BookingStartDate: z.string().nullable().optional(),
  bookingStartDate: z.string().nullable().optional(),
  BookingEndDate: z.string().nullable().optional(),
  bookingEndDate: z.string().nullable().optional(),
  TicketTypes: z.array(eventRegistrationTicketSchema).optional(),
  ticketTypes: z.array(eventRegistrationTicketSchema).optional(),
})

const eventRegistrationResponseSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  Description: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  Summary: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  BannerUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  ThemeColor: z.string().nullable().optional(),
  themeColor: z.string().nullable().optional(),
  TermsConditions: z.string().nullable().optional(),
  termsConditions: z.string().nullable().optional(),
  OrganizerName: z.string().nullable().optional(),
  organizerName: z.string().nullable().optional(),
  TimeZone: z.string().nullable().optional(),
  timeZone: z.string().nullable().optional(),
  VenueName: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  VenueMapUrl: z.string().nullable().optional(),
  venueMapUrl: z.string().nullable().optional(),
  StartDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  EndDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  BookingStartDate: z.string().nullable().optional(),
  bookingStartDate: z.string().nullable().optional(),
  BookingEndDate: z.string().nullable().optional(),
  bookingEndDate: z.string().nullable().optional(),
  RegistrationStatus: z.string().optional(),
  registrationStatus: z.string().optional(),
  CanRegister: z.boolean().optional(),
  canRegister: z.boolean().optional(),
  Sessions: z.array(eventRegistrationSessionSchema).optional(),
  sessions: z.array(eventRegistrationSessionSchema).optional(),
})

const eventWizardCreateResponseSchema = z.object({
  uniqueId: z.string().min(1),
})

const eventWizardCreateEnvelopeSchema = z.object({
  data: z.union([eventWizardCreateResponseSchema, z.string().min(1)]).nullable().optional(),
  success: z.boolean().optional(),
})

const eventWizardNameResponseSchema = z.object({
  name: z.string(),
})

const eventWizardDescriptionResponseSchema = z.object({
  description: z.string().nullable().optional(),
})

const eventWizardTermsConditionsResponseSchema = z.object({
  termsConditions: z.string().nullable().optional(),
})

const eventWizardTimeZoneResponseSchema = z.object({
  timeZoneId: z.number().int().positive().nullable().optional(),
})

const eventWizardTimeZoneOptionSchema = z.object({
  id: z.number().int().positive(),
  displayName: z.string().min(1),
  baseUtcOffsetMinutes: z.number().int(),
})

const eventWizardTimeZoneOptionsEnvelopeSchema = z.object({
  data: z.array(eventWizardTimeZoneOptionSchema).nullable().optional(),
  success: z.boolean().optional(),
})

const eventWizardBannerResponseSchema = z.object({
  uniqueId: z.string().min(1),
  bannerUrl: z.string().nullable().optional(),
  stepNo: z.number().int().min(0).optional(),
})

const eventWizardThemeColorResponseSchema = z.object({
  themeColor: z.string().nullable().optional(),
})

const eventWizardDateTimeResponseSchema = z.object({
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  bookingStartDate: z.string().nullable().optional(),
  bookingEndDate: z.string().nullable().optional(),
  stepNo: z.number().int().min(0).optional(),
})

const eventWizardDateTimeAutofillResponseSchema = z.object({
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  bookingStartDate: z.string().nullable().optional(),
  bookingEndDate: z.string().nullable().optional(),
})

const eventVisibilityValueSchema = z.enum(["Public", "Member", "Invitation"])

const eventVisibilityOptionSchema = z.object({
  value: eventVisibilityValueSchema,
  label: z.string().min(1),
  description: z.string().min(1),
})

const eventVisibilityOptionsSchema = z.array(eventVisibilityOptionSchema)

const eventPurchaseTimeLimitOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
})

const eventPurchaseTimeLimitOptionsSchema = z.array(eventPurchaseTimeLimitOptionSchema)

const eventWizardAdvancedSettingsResponseSchema = z.object({
  purchaseTimeLimit: z.number().int().positive().nullable().optional(),
  visibility: eventVisibilityValueSchema.nullable().optional(),
})

const eventEmailPlaceholderItemSchema = z.object({
  id: z.number().int().positive().nullable().optional(),
  uniqueId: z.string().nullable().optional(),
  displayText: z.string().min(1),
  placeHolderText: z.string().min(1),
})

const eventEmailPlaceHoldersResponseSchema = z.object({
  data: z.record(z.string(), z.array(eventEmailPlaceholderItemSchema)).nullable().optional(),
  success: z.boolean().optional(),
  message: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  timestamp: z.string(),
})

const eventThankYouEmailResponseSchema = z.object({
  uniqueId: z.string().min(1),
  emailSubject: z.string().nullable().optional(),
  emailTemplate: z.string().nullable().optional(),
  notifyOrganizer: z.boolean(),
  otherNotificationEmails: z.string().nullable().optional(),
  stepNo: z.number().int().min(0),
})

const serviceResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  timestamp: z.string().optional(),
  data: z.unknown().nullable().optional(),
  Data: z.unknown().nullable().optional(),
})

const eventEmailSnippetSchema = z.object({
  uniqueId: z.string().nullable().optional(),
  UniqueId: z.string().nullable().optional(),
  name: z.string().optional(),
  Name: z.string().optional(),
  template: z.string().optional(),
  Template: z.string().optional(),
  description: z.string().nullable().optional(),
  Description: z.string().nullable().optional(),
})

const eventEmailSnippetPageSchema = z.object({
  PageNo: z.number().int().optional(),
  pageNo: z.number().int().optional(),
  PageSize: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  PageCount: z.number().int().optional(),
  pageCount: z.number().int().optional(),
  TotalRecordsCount: z.number().int().optional(),
  totalRecordsCount: z.number().int().optional(),
  PageData: z.array(eventEmailSnippetSchema).optional(),
  pageData: z.array(eventEmailSnippetSchema).optional(),
})

const eventWizardPaymentAccountResponseSchema = z.object({
  paymentAccountUniqueId: z.string().nullable().optional(),
  paymentMethods: z.array(z.number().int().positive()).nullable().optional(),
})

const eventWizardVenueResponseSchema = z.object({
  venueUniqueId: z.string().nullable().optional(),
})

const eventWizardQuestionOptionSchema = z.object({
  Id: z.string().optional(),
  id: z.string().optional(),
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  DisplayText: z.string().optional(),
  displayText: z.string().optional(),
  Value: z.string().optional(),
  value: z.string().optional(),
  IsDefault: z.boolean().optional(),
  isDefault: z.boolean().optional(),
})

const eventWizardQuestionSchema = z.object({
  Id: z.string().optional(),
  id: z.string().optional(),
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  ControlId: z.number().int().optional(),
  controlId: z.number().int().optional(),
  ControlName: z.string().optional(),
  controlName: z.string().optional(),
  ControlType: z.string().optional(),
  controlType: z.string().optional(),
  IconClass: z.string().optional(),
  iconClass: z.string().optional(),
  Label: z.string().optional(),
  label: z.string().optional(),
  PlaceHolder: z.string().nullable().optional(),
  placeHolder: z.string().nullable().optional(),
  Tooltip: z.string().nullable().optional(),
  tooltip: z.string().nullable().optional(),
  Required: z.boolean().optional(),
  required: z.boolean().optional(),
  RequiredMessage: z.string().nullable().optional(),
  requiredMessage: z.string().nullable().optional(),
  AcceptedFileTypes: z.string().nullable().optional(),
  acceptedFileTypes: z.string().nullable().optional(),
  MinLength: z.string().nullable().optional(),
  minLength: z.string().nullable().optional(),
  MaxLength: z.string().nullable().optional(),
  maxLength: z.string().nullable().optional(),
  DefaultValue: z.string().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  DisplayOrder: z.number().int().optional(),
  displayOrder: z.number().int().optional(),
  Options: z.array(eventWizardQuestionOptionSchema).optional(),
  options: z.array(eventWizardQuestionOptionSchema).optional(),
})

const eventWizardQuestionsInfoSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  CustomFormUniqueIds: z.array(z.string()).optional(),
  customFormUniqueIds: z.array(z.string()).optional(),
  CustomQuestions: z.array(eventWizardQuestionSchema).optional(),
  customQuestions: z.array(eventWizardQuestionSchema).optional(),
  StepNo: z.number().int().optional(),
  stepNo: z.number().int().optional(),
})

const eventWizardSessionItemSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().min(1),
  Name: z.string().optional(),
  name: z.string().min(1),
  SetupState: z.string().optional(),
  setupState: z.string().min(1),
  StartDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  EndDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  BookingStartDate: z.string().nullable().optional(),
  bookingStartDate: z.string().nullable().optional(),
  BookingEndDate: z.string().nullable().optional(),
  bookingEndDate: z.string().nullable().optional(),
})

const eventSetupStateOptionSchema = z.object({
  Value: z.string().optional(),
  value: z.string().optional(),
  Label: z.string().optional(),
  label: z.string().optional(),
  IsSelectable: z.boolean().optional(),
  isSelectable: z.boolean().optional(),
  IsFinal: z.boolean().optional(),
  isFinal: z.boolean().optional(),
})

const eventSetupStateResponseSchema = z.object({
  SetupState: z.string().optional(),
  setupState: z.string().optional(),
})

const eventReviewSummaryResponseSchema = z.object({
  Name: z.string().optional(),
  name: z.string().optional(),
  TermsConditions: z.string().nullable().optional(),
  termsConditions: z.string().nullable().optional(),
  ThemeColor: z.string().nullable().optional(),
  themeColor: z.string().nullable().optional(),
  PaymentAccountName: z.string().nullable().optional(),
  paymentAccountName: z.string().nullable().optional(),
  PaymentAccountMerchant: z.string().nullable().optional(),
  paymentAccountMerchant: z.string().nullable().optional(),
  PaymentAccountCurrency: z.string().nullable().optional(),
  paymentAccountCurrency: z.string().nullable().optional(),
  TimeZone: z.string().nullable().optional(),
  timeZone: z.string().nullable().optional(),
  VenueName: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  Visibility: z.string().optional(),
  visibility: z.string().optional(),
  PurchaseTimeLimit: z.number().int().positive().nullable().optional(),
  purchaseTimeLimit: z.number().int().positive().nullable().optional(),
  DiscountsEnabled: z.boolean().optional(),
  discountsEnabled: z.boolean().optional(),
  HasQuestions: z.boolean().optional(),
  hasQuestions: z.boolean().optional(),
  StartDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  EndDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  BookingStartDate: z.string().nullable().optional(),
  bookingStartDate: z.string().nullable().optional(),
  BookingEndDate: z.string().nullable().optional(),
  bookingEndDate: z.string().nullable().optional(),
  SetupState: z.string().optional(),
  setupState: z.string().optional(),
  SetupStateOptions: z.array(eventSetupStateOptionSchema).optional(),
  setupStateOptions: z.array(eventSetupStateOptionSchema).optional(),
  Sessions: z.array(eventWizardSessionItemSchema).optional(),
  sessions: z.array(eventWizardSessionItemSchema).optional(),
})

const eventWizardProgressResponseSchema = z.object({
  stepNo: z.number().int().min(0),
})

export async function fetchEvents(
  filters?: EventFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<AppEvent>> {
  const res = await client.get<PaginatedResponse<AppEvent>>(API_ROUTES.events, { params: filters })
  const validated = z.array(appEventSchema).parse(res.data.items)
  return { ...res.data, items: validated }
}

function normalizeOrganizerEventListItem(item: z.infer<typeof organizerEventListItemSchema>): OrganizerEventListItem {
  return {
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
    themeColor: item.ThemeColor ?? item.themeColor ?? null,
    setupState: item.SetupState ?? item.setupState ?? "",
    isCancelled: item.IsCancelled ?? item.isCancelled ?? false,
    venueName: item.VenueName ?? item.venueName ?? null,
    startDate: item.StartDate ?? item.startDate ?? null,
    endDate: item.EndDate ?? item.endDate ?? null,
    totalAvailableTickets: item.TotalAvailableTickets ?? item.totalAvailableTickets ?? 0,
    ticketsSold: item.TicketsSold ?? item.ticketsSold ?? 0,
  }
}

export async function fetchOrganizerEvents(
  pageNo = 1,
  pageSize = 12,
  filters?: OrganizerEventListFilters
): Promise<OrganizerEventsPage> {
  const params = new URLSearchParams()
  params.set("pageNo", String(pageNo))
  params.set("pageSize", String(pageSize))

  if (filters?.name) {
    params.set("name", filters.name)
  }

  filters?.statuses?.forEach((status) => {
    params.append("statuses", status)
  })

  if (filters?.eventFrom) {
    params.set("eventFrom", filters.eventFrom)
  }

  if (filters?.eventTo) {
    params.set("eventTo", filters.eventTo)
  }

  filters?.venueUniqueIds?.forEach((venueUniqueId) => {
    params.append("venueUniqueIds", venueUniqueId)
  })

  const res = await client.get<unknown>(API_ROUTES.organizerEvents, { params })
  const responseData = parseServiceResponseData(res.data)
  const parsed = organizerEventListPageSchema.parse(responseData)
  const items = (parsed.PageData ?? parsed.pageData ?? []).map(normalizeOrganizerEventListItem)

  return {
    items,
    total: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? items.length,
    page: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    totalPages: parsed.PageCount ?? parsed.pageCount ?? 0,
  }
}

const organizerEventStatusOptionSchema = z.object({
  Text: z.string().optional(),
  text: z.string().optional(),
  Value: z.string().optional(),
  value: z.string().optional(),
})

export interface OrganizerEventStatusOption {
  value: string
  label: string
}

function parseOrganizerEventStatusOptions(payload: unknown): OrganizerEventStatusOption[] {
  const responseData = parseServiceResponseData(payload)
  return z
    .array(organizerEventStatusOptionSchema)
    .parse(responseData)
    .map((item) => ({
      value: item.Value ?? item.value ?? "",
      label: item.Text ?? item.text ?? "",
    }))
    .filter((item) => item.value.length > 0 && item.label.length > 0)
}

export async function fetchOrganizerEventStatusOptions(): Promise<OrganizerEventStatusOption[]> {
  const res = await client.get<unknown>(API_ROUTES.organizerEventStatusOptions)
  return parseOrganizerEventStatusOptions(res.data)
}

export async function fetchEvent(id: string): Promise<AppEvent> {
  const res = await client.get<AppEvent>(API_ROUTES.eventById(id))
  return appEventSchema.parse(res.data)
}

export interface EventRegistrationTicket {
  uniqueId: string
  name: string
  description: string | null
  colorCode: string | null
  fullPrice: number
  minPurchase: number
  maxPurchase: number | null
  totalQuantity: number | null
  availableForSale: number | null
  ticketsSold: number | null
  isActive: boolean
  salesStartDateUtc: string | null
  salesEndDateUtc: string | null
}

export interface EventRegistrationSession {
  uniqueId: string
  name: string
  description: string | null
  bannerUrl: string | null
  setupState: string
  bookingStatus: string
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
  ticketTypes: EventRegistrationTicket[]
}

export interface EventRegistrationResponse {
  uniqueId: string
  name: string
  description: string | null
  summary: string | null
  bannerUrl: string | null
  themeColor: string | null
  termsConditions: string | null
  organizerName: string | null
  timeZone: string | null
  venueName: string | null
  venueMapUrl: string | null
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
  registrationStatus: string
  canRegister: boolean
  sessions: EventRegistrationSession[]
}

function parseEventRegistrationTicket(item: z.infer<typeof eventRegistrationTicketSchema>): EventRegistrationTicket {
  return {
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
    description: item.Description ?? item.description ?? null,
    colorCode: item.ColorCode ?? item.colorCode ?? null,
    fullPrice: item.FullPrice ?? item.fullPrice ?? 0,
    minPurchase: item.MinPurchase ?? item.minPurchase ?? 1,
    maxPurchase: item.MaxPurchase ?? item.maxPurchase ?? null,
    totalQuantity: item.TotalQuantity ?? item.totalQuantity ?? null,
    availableForSale: item.AvailableForSale ?? item.availableForSale ?? null,
    ticketsSold: item.TicketsSold ?? item.ticketsSold ?? null,
    isActive: item.IsActive ?? item.isActive ?? false,
    salesStartDateUtc: item.SalesStartDateUtc ?? item.salesStartDateUtc ?? null,
    salesEndDateUtc: item.SalesEndDateUtc ?? item.salesEndDateUtc ?? null,
  }
}

function parseEventRegistrationSession(item: z.infer<typeof eventRegistrationSessionSchema>): EventRegistrationSession {
  return {
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
    description: item.Description ?? item.description ?? null,
    bannerUrl: item.BannerUrl ?? item.bannerUrl ?? null,
    setupState: item.SetupState ?? item.setupState ?? "",
    bookingStatus: item.BookingStatus ?? item.bookingStatus ?? "",
    startDate: item.StartDate ?? item.startDate ?? null,
    endDate: item.EndDate ?? item.endDate ?? null,
    bookingStartDate: item.BookingStartDate ?? item.bookingStartDate ?? null,
    bookingEndDate: item.BookingEndDate ?? item.bookingEndDate ?? null,
    ticketTypes: (item.TicketTypes ?? item.ticketTypes ?? []).map(parseEventRegistrationTicket),
  }
}

function parseEventRegistrationResponse(payload: unknown): EventRegistrationResponse {
  const response = eventRegistrationResponseSchema.parse(parseServiceResponseData(payload))
  return {
    uniqueId: response.UniqueId ?? response.uniqueId ?? "",
    name: response.Name ?? response.name ?? "",
    description: response.Description ?? response.description ?? null,
    summary: response.Summary ?? response.summary ?? null,
    bannerUrl: response.BannerUrl ?? response.bannerUrl ?? null,
    themeColor: response.ThemeColor ?? response.themeColor ?? null,
    termsConditions: response.TermsConditions ?? response.termsConditions ?? null,
    organizerName: response.OrganizerName ?? response.organizerName ?? null,
    timeZone: response.TimeZone ?? response.timeZone ?? null,
    venueName: response.VenueName ?? response.venueName ?? null,
    venueMapUrl: response.VenueMapUrl ?? response.venueMapUrl ?? null,
    startDate: response.StartDate ?? response.startDate ?? null,
    endDate: response.EndDate ?? response.endDate ?? null,
    bookingStartDate: response.BookingStartDate ?? response.bookingStartDate ?? null,
    bookingEndDate: response.BookingEndDate ?? response.bookingEndDate ?? null,
    registrationStatus: response.RegistrationStatus ?? response.registrationStatus ?? "",
    canRegister: response.CanRegister ?? response.canRegister ?? false,
    sessions: (response.Sessions ?? response.sessions ?? []).map(parseEventRegistrationSession),
  }
}

export async function fetchEventRegistration(eventUniqueId: string): Promise<EventRegistrationResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventRegister(eventUniqueId)}`)
  return parseEventRegistrationResponse(res.data)
}

export async function createEvent(payload: Omit<AppEvent, "id">): Promise<AppEvent> {
  const res = await client.post<AppEvent>(API_ROUTES.events, payload)
  return appEventSchema.parse(res.data)
}

export interface EventWizardCreateDraftRequest {
  name: string
}

export interface EventWizardCreateDraftResponse {
  uniqueId: string
}

export async function createEventDraft(
  payload: EventWizardCreateDraftRequest,
  stepNo = 1
): Promise<EventWizardCreateDraftResponse> {
  const res = await client.post<unknown>(API_ROUTES.eventWizardNameCreate, payload, {
    params: { stepNo },
  })

  const directResult = eventWizardCreateResponseSchema.safeParse(res.data)
  if (directResult.success) {
    return directResult.data
  }

  const envelopeResult = eventWizardCreateEnvelopeSchema.safeParse(res.data)
  if (envelopeResult.success && envelopeResult.data.data) {
    if (typeof envelopeResult.data.data === "string") {
      return { uniqueId: envelopeResult.data.data }
    }

    return envelopeResult.data.data
  }

  throw new Error("Invalid event draft response.")
}

export interface EventWizardNameResponse {
  name: string
}

export async function fetchEventWizardName(uniqueId: string): Promise<EventWizardNameResponse> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardName(uniqueId))
  return eventWizardNameResponseSchema.parse(res.data)
}

export async function updateEventWizardName(
  uniqueId: string,
  payload: EventWizardCreateDraftRequest,
  stepNo = 1
): Promise<EventWizardNameResponse> {
  const res = await client.post<unknown>(API_ROUTES.eventWizardName(uniqueId), payload, {
    params: { stepNo },
  })

  return eventWizardNameResponseSchema.parse(res.data)
}

export interface EventWizardDescriptionResponse {
  description?: string | null
}

export async function fetchEventWizardDescription(uniqueId: string): Promise<EventWizardDescriptionResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "description")}`)
  return eventWizardDescriptionResponseSchema.parse(res.data)
}

export async function updateEventWizardDescription(
  uniqueId: string,
  payload: { description: string },
  stepNo = 2
): Promise<EventWizardDescriptionResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "description")}`, payload, {
    params: { stepNo },
  })

  return eventWizardDescriptionResponseSchema.parse(res.data)
}

export interface EventWizardTermsConditionsResponse {
  termsConditions?: string | null
}

export async function fetchEventWizardTermsConditions(uniqueId: string): Promise<EventWizardTermsConditionsResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "terms-conditions")}`)
  return eventWizardTermsConditionsResponseSchema.parse(res.data)
}

export async function updateEventWizardTermsConditions(
  uniqueId: string,
  payload: { termsConditions: string },
  stepNo = 3
): Promise<EventWizardTermsConditionsResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "terms-conditions")}`, payload, {
    params: { stepNo },
  })

  return eventWizardTermsConditionsResponseSchema.parse(res.data)
}

export interface EventWizardTimeZoneResponse {
  timeZoneId?: number | null
}

export interface EventWizardTimeZoneOption {
  id: number
  displayName: string
  baseUtcOffsetMinutes: number
}

export async function fetchEventWizardTimeZone(uniqueId: string): Promise<EventWizardTimeZoneResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "time-zone")}`)
  return eventWizardTimeZoneResponseSchema.parse(res.data)
}

export async function updateEventWizardTimeZone(
  uniqueId: string,
  payload: { timeZoneId: number | null },
  stepNo = 7,
): Promise<EventWizardTimeZoneResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "time-zone")}`, payload, {
    params: { stepNo },
  })

  return eventWizardTimeZoneResponseSchema.parse(res.data)
}

export async function fetchEventWizardTimeZones(): Promise<EventWizardTimeZoneOption[]> {
  const res = await client.get<unknown>(API_ROUTES.adminTimeZones)
  const parsed = eventWizardTimeZoneOptionsEnvelopeSchema.parse(res.data)
  return parsed.data ?? []
}

export interface EventWizardBannerResponse {
  uniqueId: string
  bannerUrl?: string | null
  stepNo?: number
}

export async function fetchEventWizardBanner(uniqueId: string): Promise<EventWizardBannerResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "banner")}`)
  return eventWizardBannerResponseSchema.parse(res.data)
}

export async function updateEventWizardBanner(
  uniqueId: string,
  payload: { bannerFile: File | null; clearBanner: boolean },
  stepNo = 4,
): Promise<EventWizardBannerResponse> {
  const formData = new FormData()
  if (payload.bannerFile) {
    formData.append("file", payload.bannerFile)
  }
  formData.append("clearBanner", String(payload.clearBanner))

  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "banner")}`, formData, {
    params: { stepNo },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return eventWizardBannerResponseSchema.parse(res.data)
}

export interface EventWizardThemeColorResponse {
  themeColor?: string | null
}

export async function fetchEventWizardThemeColor(uniqueId: string): Promise<EventWizardThemeColorResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "theme-color")}`)
  return eventWizardThemeColorResponseSchema.parse(res.data)
}

export async function updateEventWizardThemeColor(
  uniqueId: string,
  payload: { themeColor: string | null },
  stepNo = 5
): Promise<EventWizardThemeColorResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "theme-color")}`, payload, {
    params: { stepNo },
  })

  return eventWizardThemeColorResponseSchema.parse(res.data)
}

export interface EventWizardDateTimeResponse {
  startDate?: string | null
  endDate?: string | null
  bookingStartDate?: string | null
  bookingEndDate?: string | null
  stepNo?: number
}

export async function fetchEventWizardDateTime(uniqueId: string): Promise<EventWizardDateTimeResponse> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardDateTime(uniqueId))
  return eventWizardDateTimeResponseSchema.parse(res.data)
}

export interface EventWizardDateTimeAutofillResponse {
  startDate?: string | null
  endDate?: string | null
  bookingStartDate?: string | null
  bookingEndDate?: string | null
}

export async function fetchEventWizardDateTimeAutofill(uniqueId: string): Promise<EventWizardDateTimeAutofillResponse> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardDateTimeAutofill(uniqueId))
  return eventWizardDateTimeAutofillResponseSchema.parse(res.data)
}

export async function updateEventWizardDateTime(
  uniqueId: string,
  payload: { startDate: string | null; endDate: string | null; bookingStartDate: string | null; bookingEndDate: string | null },
  stepNo = 10,
): Promise<EventWizardDateTimeResponse> {
  const res = await client.post<unknown>(API_ROUTES.eventWizardDateTime(uniqueId), payload, {
    params: { stepNo },
  })

  return eventWizardDateTimeResponseSchema.parse(res.data)
}

export interface EventWizardAdvancedSettingsResponse {
  purchaseTimeLimit?: number | null
  visibility?: EventVisibility | null
}

export async function fetchEventWizardAdvancedSettings(uniqueId: string): Promise<EventWizardAdvancedSettingsResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "advanced-settings")}`)
  return eventWizardAdvancedSettingsResponseSchema.parse(res.data)
}

export interface EventVisibilityOption {
  value: EventVisibility
  label: string
  description: string
}

export async function fetchEventWizardVisibilityOptions(): Promise<EventVisibilityOption[]> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardVisibilityOptions)
  return eventVisibilityOptionsSchema.parse(res.data)
}

export interface EventPurchaseTimeLimitOption {
  value: string
  label: string
}

export async function fetchEventWizardPurchaseTimeLimitOptions(): Promise<EventPurchaseTimeLimitOption[]> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardPurchaseTimeLimitOptions)
  return eventPurchaseTimeLimitOptionsSchema.parse(res.data)
}

export async function updateEventWizardAdvancedSettings(
  uniqueId: string,
  payload: { purchaseTimeLimit: number | null; visibility: EventVisibility },
  stepNo = 14
): Promise<EventWizardAdvancedSettingsResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "advanced-settings")}`, payload, {
    params: { stepNo },
  })

  return eventWizardAdvancedSettingsResponseSchema.parse(res.data)
}

export interface EventEmailPlaceholderItem {
  id?: number | null
  uniqueId?: string | null
  displayText: string
  placeHolderText: string
}

export interface EventEmailPlaceholderGroup {
  label: string
  items: EventEmailPlaceholderItem[]
}

export interface EventThankYouEmailResponse {
  uniqueId: string
  emailSubject?: string | null
  emailTemplate?: string | null
  notifyOrganizer: boolean
  otherNotificationEmails?: string | null
  stepNo: number
}

export async function fetchEventEmailTemplatePlaceHolders(): Promise<EventEmailPlaceholderGroup[]> {
  const res = await client.get<unknown>(API_ROUTES.eventEmailTemplatePlaceHolders)
  const parsed = eventEmailPlaceHoldersResponseSchema.parse(res.data)

  return Object.entries(parsed.data ?? {}).map(([label, items]) => ({
    label,
    items: items.map((item) => ({
      id: item.id ?? null,
      uniqueId: item.uniqueId ?? null,
      displayText: item.displayText,
      placeHolderText: item.placeHolderText,
    })),
  }))
}

export async function fetchEventWizardThankYouEmail(uniqueId: string): Promise<EventThankYouEmailResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "thank-you-email")}`)
  return eventThankYouEmailResponseSchema.parse(res.data)
}

export async function updateEventWizardThankYouEmail(
  uniqueId: string,
  payload: {
    emailSubject: string | null
    emailTemplate: string | null
    notifyOrganizer: boolean
    otherNotificationEmails: string | null
  },
  stepNo = 13,
): Promise<EventThankYouEmailResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "thank-you-email")}`, payload, {
    params: { stepNo },
  })

  return eventThankYouEmailResponseSchema.parse(res.data)
}

export interface EventSetupStateOption {
  value: string
  label: string
  isSelectable: boolean
  isFinal: boolean
}

export interface EventSetupStateResponse {
  setupState: string
}

function parseEventSetupStateResponse(payload: unknown): EventSetupStateResponse {
  const parsed = eventSetupStateResponseSchema.parse(payload)
  return {
    setupState: parsed.SetupState ?? parsed.setupState ?? "",
  }
}

function parseEventSetupStateOptions(payload: unknown): EventSetupStateOption[] {
  return z
    .array(eventSetupStateOptionSchema)
    .parse(payload)
    .map((item) => ({
      value: item.Value ?? item.value ?? "",
      label: item.Label ?? item.label ?? "",
      isSelectable: item.IsSelectable ?? item.isSelectable ?? false,
      isFinal: item.IsFinal ?? item.isFinal ?? false,
    }))
}

export async function fetchEventWizardSetupState(uniqueId: string): Promise<EventSetupStateResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "setup-state")}`)
  return parseEventSetupStateResponse(res.data)
}

export async function fetchEventWizardSetupStateOptions(): Promise<EventSetupStateOption[]> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardSetupStateOptions)
  return parseEventSetupStateOptions(res.data)
}

export interface EventReviewSummaryResponse {
  name: string
  termsConditions: string | null
  themeColor: string | null
  paymentAccountName: string | null
  paymentAccountMerchant: string | null
  paymentAccountCurrency: string | null
  timeZone: string | null
  venueName: string | null
  visibility: string
  purchaseTimeLimit: number | null
  discountsEnabled: boolean
  hasQuestions: boolean
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
  setupState: string
  setupStateOptions: EventSetupStateOption[]
  sessions: EventWizardSessionItem[]
}

function parseEventReviewSummary(payload: unknown): EventReviewSummaryResponse {
  const parsed = eventReviewSummaryResponseSchema.parse(payload)

  return {
    name: parsed.Name ?? parsed.name ?? "",
    termsConditions: parsed.TermsConditions ?? parsed.termsConditions ?? null,
    themeColor: parsed.ThemeColor ?? parsed.themeColor ?? null,
    paymentAccountName: parsed.PaymentAccountName ?? parsed.paymentAccountName ?? null,
    paymentAccountMerchant: parsed.PaymentAccountMerchant ?? parsed.paymentAccountMerchant ?? null,
    paymentAccountCurrency: parsed.PaymentAccountCurrency ?? parsed.paymentAccountCurrency ?? null,
    timeZone: parsed.TimeZone ?? parsed.timeZone ?? null,
    venueName: parsed.VenueName ?? parsed.venueName ?? null,
    visibility: parsed.Visibility ?? parsed.visibility ?? "",
    purchaseTimeLimit: parsed.PurchaseTimeLimit ?? parsed.purchaseTimeLimit ?? null,
    discountsEnabled: parsed.DiscountsEnabled ?? parsed.discountsEnabled ?? false,
    hasQuestions: parsed.HasQuestions ?? parsed.hasQuestions ?? false,
    startDate: parsed.StartDate ?? parsed.startDate ?? null,
    endDate: parsed.EndDate ?? parsed.endDate ?? null,
    bookingStartDate: parsed.BookingStartDate ?? parsed.bookingStartDate ?? null,
    bookingEndDate: parsed.BookingEndDate ?? parsed.bookingEndDate ?? null,
    setupState: parsed.SetupState ?? parsed.setupState ?? "",
    setupStateOptions: parseEventSetupStateOptions(parsed.SetupStateOptions ?? parsed.setupStateOptions ?? []),
    sessions: z.array(eventWizardSessionItemSchema).parse(parsed.Sessions ?? parsed.sessions ?? []),
  }
}

export async function fetchEventWizardReviewSummary(uniqueId: string): Promise<EventReviewSummaryResponse> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardReviewSummary(uniqueId))
  return parseEventReviewSummary(res.data)
}

export async function markEventWizardReadyForReview(uniqueId: string): Promise<EventSetupStateResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "setup-state/review")}`)
  return parseEventSetupStateResponse(res.data)
}

export async function updateEventWizardSetupState(
  uniqueId: string,
  setupState: string,
): Promise<EventSetupStateResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "setup-state")}`, { setupState })
  return parseEventSetupStateResponse(res.data)
}

export interface EventEmailSnippet {
  uniqueId: string
  name: string
  template: string
  description: string | null
}

export interface EventEmailSnippetsPage {
  pageNo: number
  pageSize: number
  pageCount: number
  totalRecordsCount: number
  pageData: EventEmailSnippet[]
}

export interface EventEmailSnippetCreateRequest {
  name: string
  template: string
  description?: string | null
}

export interface EventEmailSnippetUpdateRequest extends EventEmailSnippetCreateRequest {
  uniqueId?: string
}

function readServiceResponseData(payload: unknown): unknown {
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

function parseServiceResponseData(payload: unknown): unknown {
  const serviceResponse = serviceResponseSchema.parse(payload) as ServiceResponse<unknown> & {
    Data?: unknown
    data?: unknown
  }

  return readServiceResponseData(serviceResponse)
}

function normalizeEventEmailSnippet(item: z.infer<typeof eventEmailSnippetSchema>): EventEmailSnippet {
  return {
    uniqueId: item.UniqueId ?? item.uniqueId ?? "",
    name: item.Name ?? item.name ?? "",
    template: item.Template ?? item.template ?? "",
    description: item.Description ?? item.description ?? null,
  }
}

export async function fetchEventEmailSnippets(pageNo = 1, pageSize = 5000): Promise<EventEmailSnippetsPage> {
  const res = await client.get<unknown>(API_ROUTES.eventEmailTemplateSnippetList, {
    params: { pageNo, pageSize },
  })
  const responseData = parseServiceResponseData(res.data)
  const parsed = eventEmailSnippetPageSchema.parse(responseData)
  const pageData = (parsed.PageData ?? parsed.pageData ?? []).map(normalizeEventEmailSnippet)

  return {
    pageNo: parsed.PageNo ?? parsed.pageNo ?? pageNo,
    pageSize: parsed.PageSize ?? parsed.pageSize ?? pageSize,
    pageCount: parsed.PageCount ?? parsed.pageCount ?? 0,
    totalRecordsCount: parsed.TotalRecordsCount ?? parsed.totalRecordsCount ?? pageData.length,
    pageData,
  }
}

export async function fetchEventEmailSnippetDetail(snippetId: string): Promise<EventEmailSnippet> {
  const res = await client.get<unknown>(API_ROUTES.eventEmailTemplateSnippetDetail(snippetId))
  const responseData = parseServiceResponseData(res.data)
  return normalizeEventEmailSnippet(eventEmailSnippetSchema.parse(responseData))
}

export async function createEventEmailSnippet(payload: EventEmailSnippetCreateRequest): Promise<string> {
  const res = await client.post<unknown>(API_ROUTES.eventEmailTemplateSnippetCreate, payload)
  const responseData = parseServiceResponseData(res.data)

  if (typeof responseData === "string") {
    return responseData
  }

  if (responseData && typeof responseData === "object" && "uniqueId" in responseData) {
    const value = (responseData as { uniqueId?: unknown }).uniqueId
    if (typeof value === "string") {
      return value
    }
  }

  if (responseData && typeof responseData === "object" && "UniqueId" in responseData) {
    const value = (responseData as { UniqueId?: unknown }).UniqueId
    if (typeof value === "string") {
      return value
    }
  }

  throw new Error("Invalid event email snippet create response.")
}

export async function updateEventEmailSnippet(snippetId: string, payload: EventEmailSnippetUpdateRequest): Promise<void> {
  await client.post<unknown>(API_ROUTES.eventEmailTemplateSnippetUpdate(snippetId), payload)
}

export async function deleteEventEmailSnippet(snippetId: string): Promise<void> {
  await client.post<unknown>(API_ROUTES.eventEmailTemplateSnippetDelete(snippetId))
}

export interface EventWizardPaymentAccountResponse {
  paymentAccountUniqueId?: string | null
  paymentMethods?: number[] | null
}

export async function fetchEventWizardPaymentAccount(uniqueId: string): Promise<EventWizardPaymentAccountResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "payment-account")}`)
  return eventWizardPaymentAccountResponseSchema.parse(res.data)
}

export interface EventWizardVenueResponse {
  venueUniqueId?: string | null
}

export interface EventWizardQuestionOption {
  id: string
  displayText: string
  value: string
  isDefault: boolean
}

export interface EventWizardQuestion {
  id: string
  controlId: number
  controlName: string
  controlType: string
  iconClass: string
  label: string
  placeHolder: string | null
  tooltip: string | null
  required: boolean
  requiredMessage: string | null
  acceptedFileTypes: string[]
  minLength: string | null
  maxLength: string | null
  defaultValue: string | null
  displayOrder: number
  options: EventWizardQuestionOption[]
}

export interface EventWizardQuestionsInfo {
  uniqueId: string
  customFormUniqueIds: string[]
  customQuestions: EventWizardQuestion[]
  stepNo: number
}

export interface EventWizardQuestionsRequest {
  customFormUniqueIds: string[] | null
  customQuestions: EventWizardQuestion[] | null
}

export async function fetchEventWizardVenue(uniqueId: string): Promise<EventWizardVenueResponse> {
  const res = await client.get<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "venue")}`)
  return eventWizardVenueResponseSchema.parse(res.data)
}

export async function updateEventWizardVenue(
  uniqueId: string,
  payload: { venueUniqueId: string },
  stepNo = 8
): Promise<EventWizardVenueResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "venue")}`, payload, {
    params: { stepNo },
  })

  return eventWizardVenueResponseSchema.parse(res.data)
}

function serializeEventQuestionForRequest(question: EventWizardQuestion): Record<string, unknown> {
  const controlType = question.controlType.toLowerCase()
  const acceptedFileTypes =
    controlType === "file" || controlType === "upload"
      ? question.acceptedFileTypes.length > 0
        ? question.acceptedFileTypes.join(", ")
        : null
      : null

  return {
    id: question.id,
    controlId: question.controlId,
    controlName: question.controlName,
    controlType: question.controlType,
    iconClass: question.iconClass,
    label: question.label,
    placeHolder: question.placeHolder,
    tooltip: question.tooltip,
    required: question.required,
    requiredMessage: question.requiredMessage,
    acceptedFileTypes,
    minLength: question.minLength,
    maxLength: question.maxLength,
    defaultValue: question.defaultValue,
    displayOrder: question.displayOrder,
    options: question.options.map((option) => ({
      id: option.id,
      displayText: option.displayText,
      value: option.value,
      isDefault: option.isDefault,
    })),
  }
}

export async function fetchEventWizardQuestions(uniqueId: string): Promise<EventWizardQuestionsInfo> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardQuestions(uniqueId))
  const questions = eventWizardQuestionsInfoSchema.parse(res.data)

  return {
    uniqueId: questions.UniqueId ?? questions.uniqueId ?? "",
    customFormUniqueIds: questions.CustomFormUniqueIds ?? questions.customFormUniqueIds ?? [],
    customQuestions: (questions.CustomQuestions ?? questions.customQuestions ?? []).map((question) => ({
      id: question.UniqueId ?? question.uniqueId ?? "",
      controlId: question.ControlId ?? question.controlId ?? 0,
      controlName: question.ControlName ?? question.controlName ?? "",
      controlType: question.ControlType ?? question.controlType ?? "",
      iconClass: question.IconClass ?? question.iconClass ?? "",
      label: question.Label ?? question.label ?? "",
      placeHolder: question.PlaceHolder ?? question.placeHolder ?? null,
      tooltip: question.Tooltip ?? question.tooltip ?? null,
      required: question.Required ?? question.required ?? false,
      requiredMessage: question.RequiredMessage ?? question.requiredMessage ?? null,
      acceptedFileTypes: (question.AcceptedFileTypes ?? question.acceptedFileTypes ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      minLength: question.MinLength ?? question.minLength ?? null,
      maxLength: question.MaxLength ?? question.maxLength ?? null,
      defaultValue: question.DefaultValue ?? question.defaultValue ?? null,
      displayOrder: question.DisplayOrder ?? question.displayOrder ?? 0,
      options: (question.Options ?? question.options ?? []).map((option) => ({
        id: option.UniqueId ?? option.uniqueId ?? "",
        displayText: option.DisplayText ?? option.displayText ?? "",
        value: option.Value ?? option.value ?? "",
        isDefault: option.IsDefault ?? option.isDefault ?? false,
      })),
    })),
    stepNo: questions.StepNo ?? questions.stepNo ?? 11,
  }
}

export async function updateEventWizardQuestions(
  uniqueId: string,
  payload: EventWizardQuestionsRequest,
  stepNo = 11,
): Promise<EventWizardQuestionsInfo> {
  const requestPayload = {
    customFormUniqueIds: payload.customFormUniqueIds,
    customQuestions: payload.customQuestions?.map(serializeEventQuestionForRequest) ?? null,
  }

  const res = await client.post<unknown>(API_ROUTES.eventWizardQuestions(uniqueId), requestPayload, {
    params: { stepNo },
  })
  const questions = eventWizardQuestionsInfoSchema.parse(res.data)

  return {
    uniqueId: questions.UniqueId ?? questions.uniqueId ?? "",
    customFormUniqueIds: questions.CustomFormUniqueIds ?? questions.customFormUniqueIds ?? [],
    customQuestions: (questions.CustomQuestions ?? questions.customQuestions ?? []).map((question) => ({
      id: question.UniqueId ?? question.uniqueId ?? "",
      controlId: question.ControlId ?? question.controlId ?? 0,
      controlName: question.ControlName ?? question.controlName ?? "",
      controlType: question.ControlType ?? question.controlType ?? "",
      iconClass: question.IconClass ?? question.iconClass ?? "",
      label: question.Label ?? question.label ?? "",
      placeHolder: question.PlaceHolder ?? question.placeHolder ?? null,
      tooltip: question.Tooltip ?? question.tooltip ?? null,
      required: question.Required ?? question.required ?? false,
      requiredMessage: question.RequiredMessage ?? question.requiredMessage ?? null,
      acceptedFileTypes: (question.AcceptedFileTypes ?? question.acceptedFileTypes ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      minLength: question.MinLength ?? question.minLength ?? null,
      maxLength: question.MaxLength ?? question.maxLength ?? null,
      defaultValue: question.DefaultValue ?? question.defaultValue ?? null,
      displayOrder: question.DisplayOrder ?? question.displayOrder ?? 0,
      options: (question.Options ?? question.options ?? []).map((option) => ({
        id: option.UniqueId ?? option.uniqueId ?? "",
        displayText: option.DisplayText ?? option.displayText ?? "",
        value: option.Value ?? option.value ?? "",
        isDefault: option.IsDefault ?? option.isDefault ?? false,
      })),
    })),
    stepNo: questions.StepNo ?? questions.stepNo ?? stepNo,
  }
}

export type EventWizardSessionItem = z.infer<typeof eventWizardSessionItemSchema>

export interface EventWizardSessionCreateRequest {
  name: string
}

export async function fetchEventWizardSessions(uniqueId: string): Promise<EventWizardSessionItem[]> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardSessions(uniqueId))
  return z.array(eventWizardSessionItemSchema).parse(res.data)
}

export async function createEventWizardSession(
  uniqueId: string,
  payload: EventWizardSessionCreateRequest
): Promise<EventWizardSessionItem> {
  const res = await client.post<unknown>(API_ROUTES.eventWizardSessions(uniqueId), payload)

  return eventWizardSessionItemSchema.parse(res.data)
}

export async function updateEventWizardPaymentAccount(
  uniqueId: string,
  payload: { paymentAccountUniqueId: string; paymentMethods: number[] },
  stepNo = 6
): Promise<EventWizardPaymentAccountResponse> {
  const res = await client.post<unknown>(`${API_ROUTES.eventWizardStep(uniqueId, "payment-account")}`, payload, {
    params: { stepNo },
  })

  return eventWizardPaymentAccountResponseSchema.parse(res.data)
}

export interface EventWizardProgressResponse {
  stepNo: number
}

export async function fetchEventWizardProgress(uniqueId: string): Promise<EventWizardProgressResponse> {
  const res = await client.get<unknown>(API_ROUTES.eventWizardProgress(uniqueId))
  return eventWizardProgressResponseSchema.parse(res.data)
}

export async function skipEventWizardStep(uniqueId: string, stepNo: number): Promise<EventWizardProgressResponse> {
  const res = await client.post<unknown>(API_ROUTES.eventWizardSkip(uniqueId), null, {
    params: { stepNo },
  })

  return eventWizardProgressResponseSchema.parse(res.data)
}

export async function updateEvent(id: string, payload: Partial<Omit<AppEvent, "id">>): Promise<AppEvent> {
  const res = await client.patch<AppEvent>(API_ROUTES.eventById(id), payload)
  return appEventSchema.parse(res.data)
}

export async function deleteEvent(id: string): Promise<void> {
  await client.delete(API_ROUTES.eventById(id))
}

import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"

const serviceResponseSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().nullable().optional(),
    errorCode: z.string().nullable().optional(),
    validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
    meta: z.record(z.string(), z.unknown()).nullable().optional(),
    timestamp: z.string().optional(),
    Data: z.unknown().optional(),
    data: z.unknown().optional(),
  })
  .passthrough()

const sessionNameSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
})

const sessionDescriptionSchema = z.object({
  Description: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

const sessionBannerSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  BannerUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  StepNo: z.number().int().optional(),
  stepNo: z.number().int().optional(),
})

const sessionGenreSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  IsSystem: z.boolean().optional(),
  isSystem: z.boolean().optional(),
  IsSelected: z.boolean().optional(),
  isSelected: z.boolean().optional(),
})

const sessionGenreListSchema = z.array(sessionGenreSchema)

const sessionVenueSchema = z.object({
  VenueUniqueId: z.string().optional(),
  venueUniqueId: z.string().optional(),
})

const sessionMembershipAccessItemSchema = z.object({
  MembershipTypeUniqueId: z.string().optional(),
  membershipTypeUniqueId: z.string().optional(),
  MembershipTypeName: z.string().optional(),
  membershipTypeName: z.string().optional(),
  DiscountType: z.enum(["FixedAmount", "Percentage"]).nullable().optional(),
  discountType: z.enum(["FixedAmount", "Percentage"]).nullable().optional(),
  DiscountValue: z.union([z.number(), z.string()]).nullable().optional(),
  discountValue: z.union([z.number(), z.string()]).nullable().optional(),
  MaxDiscountAmount: z.union([z.number(), z.string()]).nullable().optional(),
  maxDiscountAmount: z.union([z.number(), z.string()]).nullable().optional(),
})

const sessionMembershipAccessSchema = z.object({
  IsRestricted: z.boolean().optional(),
  isRestricted: z.boolean().optional(),
  Memberships: z.array(sessionMembershipAccessItemSchema).optional(),
  memberships: z.array(sessionMembershipAccessItemSchema).optional(),
})

const sessionSeatSelectionSchema = z.object({
  OfferPickingSeats: z.boolean().optional(),
  offerPickingSeats: z.boolean().optional(),
  SeatsIoEventUniqueId: z.string().nullable().optional(),
  seatsIoEventUniqueId: z.string().nullable().optional(),
  SeatsIoChartUniqueId: z.string().nullable().optional(),
  seatsIoChartUniqueId: z.string().nullable().optional(),
  SeatsIoChartName: z.string().nullable().optional(),
  seatsIoChartName: z.string().nullable().optional(),
  SeatsIoEventLabel: z.string().nullable().optional(),
  seatsIoEventLabel: z.string().nullable().optional(),
})

const sessionBookingSchema = z.object({
  BookingStartDate: z.string().nullable().optional(),
  bookingStartDate: z.string().nullable().optional(),
  BookingEndDate: z.string().nullable().optional(),
  bookingEndDate: z.string().nullable().optional(),
})

const sessionDateTimeSchema = z.object({
  BookingStartDate: z.string().nullable().optional(),
  bookingStartDate: z.string().nullable().optional(),
  BookingEndDate: z.string().nullable().optional(),
  bookingEndDate: z.string().nullable().optional(),
  StartDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  EndDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  StepNo: z.number().int().optional(),
  stepNo: z.number().int().optional(),
})

const sessionDurationSchema = z.object({
  StartDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  EndDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
})

const sessionEventSchema = z.object({
  EventUniqueId: z.string().optional(),
  eventUniqueId: z.string().optional(),
})

const sessionProgressSchema = z.object({
  stepNo: z.number().int().min(0),
})

const sessionSetupStateSchema = z.object({
  SetupState: z.string().optional(),
  setupState: z.string().optional(),
})

const sessionSetupStateOptionSchema = z.object({
  Value: z.string().optional(),
  value: z.string().optional(),
  Label: z.string().optional(),
  label: z.string().optional(),
  IsSelectable: z.boolean().optional(),
  isSelectable: z.boolean().optional(),
  IsFinal: z.boolean().optional(),
  isFinal: z.boolean().optional(),
})

const sessionETicketingSchema = z.object({
  EnableDigitalTicket: z.boolean().optional(),
  enableDigitalTicket: z.boolean().optional(),
  RequiresAttendeeInfo: z.boolean().optional(),
  requiresAttendeeInfo: z.boolean().optional(),
})

const sessionScheduleSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  ScheduleTime: z.string().optional(),
  scheduleTime: z.string().optional(),
})

const sessionScheduleListSchema = z.array(sessionScheduleSchema)

const sessionTicketSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  Description: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  SeatsIoChartCategoryId: z.number().int().nullable().optional(),
  seatsIoChartCategoryId: z.number().int().nullable().optional(),
  TotalQuantity: z.number().int().nullable().optional(),
  totalQuantity: z.number().int().nullable().optional(),
  FullPrice: z.union([z.number(), z.string()]).nullable().optional(),
  fullPrice: z.union([z.number(), z.string()]).nullable().optional(),
  MinPurchase: z.number().int().nullable().optional(),
  minPurchase: z.number().int().nullable().optional(),
  MaxPurchase: z.number().int().nullable().optional(),
  maxPurchase: z.number().int().nullable().optional(),
  IsActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  DisplayOrder: z.number().int().optional(),
  displayOrder: z.number().int().optional(),
  PricePeriods: z
    .array(
      z.object({
        UniqueId: z.string().optional(),
        uniqueId: z.string().optional(),
        Name: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        Amount: z.union([z.number(), z.string()]).optional(),
        amount: z.union([z.number(), z.string()]).optional(),
        StartDateTime: z.string().optional(),
        startDateTime: z.string().optional(),
        EndDateTime: z.string().optional(),
        endDateTime: z.string().optional(),
        CurrentStatus: z.string().optional(),
        currentStatus: z.string().optional(),
      }),
    )
    .optional(),
  pricePeriods: z
    .array(
      z.object({
        UniqueId: z.string().optional(),
        uniqueId: z.string().optional(),
        Name: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        Amount: z.union([z.number(), z.string()]).optional(),
        amount: z.union([z.number(), z.string()]).optional(),
        StartDateTime: z.string().optional(),
        startDateTime: z.string().optional(),
        EndDateTime: z.string().optional(),
        endDateTime: z.string().optional(),
        CurrentStatus: z.string().optional(),
        currentStatus: z.string().optional(),
      }),
    )
    .optional(),
})

const sessionTicketListSchema = z.array(sessionTicketSchema)

const sessionQuestionOptionSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  DisplayText: z.string().optional(),
  displayText: z.string().optional(),
  Value: z.string().optional(),
  value: z.string().optional(),
  IsDefault: z.boolean().optional(),
  isDefault: z.boolean().optional(),
})

const sessionQuestionSchema = z.object({
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
  Options: z.array(sessionQuestionOptionSchema).optional(),
  options: z.array(sessionQuestionOptionSchema).optional(),
})

const sessionQuestionsInfoSchema = z.object({
  UniqueId: z.string().optional(),
  uniqueId: z.string().optional(),
  CustomFormUniqueIds: z.array(z.string()).optional(),
  customFormUniqueIds: z.array(z.string()).optional(),
  CustomQuestions: z.array(sessionQuestionSchema).optional(),
  customQuestions: z.array(sessionQuestionSchema).optional(),
  StepNo: z.number().int().optional(),
  stepNo: z.number().int().optional(),
})

const sessionReviewSummarySchema = z.object({
  Name: z.string().optional(),
  name: z.string().optional(),
  EventName: z.string().nullable().optional(),
  eventName: z.string().nullable().optional(),
  VenueName: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  Genres: z.array(sessionGenreSchema).optional(),
  genres: z.array(sessionGenreSchema).optional(),
  MembershipAccess: sessionMembershipAccessSchema.optional(),
  membershipAccess: sessionMembershipAccessSchema.optional(),
  SeatSelection: sessionSeatSelectionSchema.optional(),
  seatSelection: sessionSeatSelectionSchema.optional(),
  Booking: sessionBookingSchema.optional(),
  booking: sessionBookingSchema.optional(),
  Duration: sessionDurationSchema.optional(),
  duration: sessionDurationSchema.optional(),
  Questions: sessionQuestionsInfoSchema.optional(),
  questions: sessionQuestionsInfoSchema.optional(),
  ETicketing: sessionETicketingSchema.optional(),
  eTicketing: sessionETicketingSchema.optional(),
  ScheduleCount: z.number().int().optional(),
  scheduleCount: z.number().int().optional(),
  TicketCount: z.number().int().optional(),
  ticketCount: z.number().int().optional(),
  SetupState: z.string().optional(),
  setupState: z.string().optional(),
  SetupStateOptions: z.array(z.lazy(() => sessionSetupStateOptionSchema)).optional(),
  setupStateOptions: z.array(z.lazy(() => sessionSetupStateOptionSchema)).optional(),
})

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
  if (Array.isArray(payload)) {
    return payload
  }

  const serviceResponse = serviceResponseSchema.parse(payload)
  return readResponseData(serviceResponse)
}

export interface SessionWizardName {
  uniqueId: string
  name: string
}

export interface SessionWizardDescription {
  description: string | null
}

export interface SessionWizardBanner {
  uniqueId: string
  bannerUrl: string | null
  stepNo: number
}

export interface SessionWizardGenre {
  uniqueId: string
  name: string
  isSystem: boolean
  isSelected: boolean
}

export interface SessionWizardGenreRequest {
  genreUniqueIds: string[]
}

export interface SessionWizardGenreCreateRequest {
  name: string
}

export interface SessionWizardVenue {
  venueUniqueId: string
}

export type SessionWizardMembershipDiscountType = "FixedAmount" | "Percentage"

export interface SessionWizardMembershipAccessItem {
  membershipTypeUniqueId: string
  membershipTypeName?: string
  discountType: SessionWizardMembershipDiscountType | null
  discountValue: number | null
  maxDiscountAmount: number | null
}

export interface SessionWizardMembershipAccess {
  isRestricted: boolean
  memberships: SessionWizardMembershipAccessItem[]
}

export interface SessionWizardMembershipAccessRequest {
  memberships: SessionWizardMembershipAccessItem[]
}

export interface SessionWizardSeatSelection {
  offerPickingSeats: boolean
  seatsIoEventUniqueId: string | null
  seatsIoChartUniqueId: string | null
  seatsIoChartName: string | null
  seatsIoEventLabel: string | null
}

export interface SessionWizardEvent {
  eventUniqueId: string
}

export interface SessionWizardBooking {
  bookingStartDate: string | null
  bookingEndDate: string | null
}

export interface SessionWizardDuration {
  startDate: string | null
  endDate: string | null
}

export interface SessionWizardDateTime {
  bookingStartDate: string | null
  bookingEndDate: string | null
  startDate: string | null
  endDate: string | null
  stepNo: number
}

export interface SessionWizardNameRequest {
  name: string
}

export interface SessionWizardDescriptionRequest {
  description: string | null
}

export interface SessionWizardBannerRequest {
  bannerFile: File | null
  clearBanner: boolean
}

export interface SessionWizardQuestionOption {
  id: string
  displayText: string
  value: string
  isDefault: boolean
}

export interface SessionWizardQuestion {
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
  options: SessionWizardQuestionOption[]
}

export interface SessionWizardQuestionsInfo {
  uniqueId: string
  customFormUniqueIds: string[]
  customQuestions: SessionWizardQuestion[]
  stepNo: number
}

export interface SessionWizardQuestionsRequest {
  customFormUniqueIds: string[] | null
  customQuestions: SessionWizardQuestion[] | null
}

export interface SessionWizardVenueRequest {
  venueUniqueId: string
}

export interface SessionWizardSeatSelectionRequest {
  offerPickingSeats: boolean
  seatsIoEventUniqueId: string | null
}

export interface SessionWizardEventRequest {
  eventUniqueId: string
}

export interface SessionWizardBookingRequest {
  bookingStartDate: string | null
  bookingEndDate: string | null
}

export interface SessionWizardDurationRequest {
  startDate: string | null
  endDate: string | null
}

export interface SessionWizardDateTimeRequest {
  bookingStartDate: string | null
  bookingEndDate: string | null
  startDate: string | null
  endDate: string | null
}

export interface SessionWizardProgressResponse {
  stepNo: number
}

export interface SessionWizardSetupState {
  setupState: string
}

export interface SessionWizardSetupStateOption {
  value: string
  label: string
  isSelectable: boolean
  isFinal: boolean
}

export interface SessionWizardSetupStateRequest {
  setupState: string
}

export interface SessionReviewSummary {
  name: string
  eventName: string | null
  venueName: string | null
  genres: SessionWizardGenre[]
  membershipAccess: SessionWizardMembershipAccess
  seatSelection: SessionWizardSeatSelection
  booking: SessionWizardBooking
  duration: SessionWizardDuration
  questions: SessionWizardQuestionsInfo
  eTicketing: SessionWizardETicketing
  scheduleCount: number
  ticketCount: number
  setupState: string
  setupStateOptions: SessionWizardSetupStateOption[]
}

export interface SessionWizardETicketing {
  enableDigitalTicket: boolean
  requiresAttendeeInfo: boolean
}

export interface SessionWizardETicketingRequest {
  enableDigitalTicket: boolean
  requiresAttendeeInfo: boolean
}

export interface SessionWizardSchedule {
  uniqueId: string
  name: string
  scheduleTime: string
}

export interface SessionWizardScheduleRequest {
  name: string
  scheduleTime: string
}

export interface SessionWizardTicket {
  uniqueId: string
  name: string
  description: string | null
  seatsIoChartCategoryId: number | null
  totalQuantity: number | null
  fullPrice: string
  minPurchase: number | null
  maxPurchase: number | null
  isActive: boolean
  displayOrder: number
  pricePeriods: SessionWizardTicketPricePeriod[]
}

export interface SessionWizardTicketPricePeriod {
  uniqueId: string
  name: string | null
  amount: string
  startDateTime: string
  endDateTime: string
  currentStatus: string
}

export interface SessionWizardTicketRequest {
  name: string
  description: string | null
  seatsIoChartCategoryId: number | null
  totalQuantity: number
  fullPrice: number
  minPurchase: number | null
  maxPurchase: number | null
  isActive: boolean
}

export interface SessionWizardTicketDisplayOrderRequest {
  ticketUniqueIds: string[]
}

export interface SessionWizardTicketPricePeriodRequest {
  name: string | null
  amount: number
  startDateTime: string
  endDateTime: string
}

function normalizeScheduleTime(value: string | undefined): string {
  if (!value) {
    return ""
  }

  return value.length >= 5 ? value.slice(0, 5) : value
}

function normalizeTicketPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return ""
  }

  return typeof value === "number" ? value.toString() : value
}

function normalizeNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeDateTime(value: string | undefined): string {
  if (!value) {
    return ""
  }

  return value
}

function serializeQuestionForRequest(question: SessionWizardQuestion): Record<string, unknown> {
  const controlType = question.controlType.toLowerCase()
  const acceptedFileTypes = controlType === "file" || controlType === "upload"
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

function mapSessionQuestionsInfo(
  questions: z.infer<typeof sessionQuestionsInfoSchema>,
  stepNoFallback: number,
): SessionWizardQuestionsInfo {
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
    stepNo: questions.StepNo ?? questions.stepNo ?? stepNoFallback,
  }
}

export async function fetchSessionWizardName(uniqueId: string): Promise<SessionWizardName> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardName(uniqueId))
  const responseData = parseServicePayload(res.data)
  const session = sessionNameSchema.parse(responseData)

  return {
    uniqueId: session.UniqueId ?? session.uniqueId ?? "",
    name: session.Name ?? session.name ?? "",
  }
}

export async function updateSessionWizardName(
  uniqueId: string,
  payload: SessionWizardNameRequest,
  stepNo = 1,
): Promise<SessionWizardName> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardName(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const session = sessionNameSchema.parse(responseData)

  return {
    uniqueId: session.UniqueId ?? session.uniqueId ?? "",
    name: session.Name ?? session.name ?? "",
  }
}

export async function fetchSessionWizardDescription(uniqueId: string): Promise<SessionWizardDescription> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardDescription(uniqueId))
  const responseData = parseServicePayload(res.data)
  const description = sessionDescriptionSchema.parse(responseData)

  return {
    description: description.Description ?? description.description ?? null,
  }
}

export async function updateSessionWizardDescription(
  uniqueId: string,
  payload: SessionWizardDescriptionRequest,
  stepNo = 2,
): Promise<SessionWizardDescription> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardDescription(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const description = sessionDescriptionSchema.parse(responseData)

  return {
    description: description.Description ?? description.description ?? null,
  }
}

export async function fetchSessionWizardBanner(uniqueId: string): Promise<SessionWizardBanner> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardBanner(uniqueId))
  const responseData = parseServicePayload(res.data)
  const banner = sessionBannerSchema.parse(responseData)

  return {
    uniqueId: banner.UniqueId ?? banner.uniqueId ?? "",
    bannerUrl: banner.BannerUrl ?? banner.bannerUrl ?? null,
    stepNo: banner.StepNo ?? banner.stepNo ?? 4,
  }
}

export async function updateSessionWizardBanner(
  uniqueId: string,
  payload: SessionWizardBannerRequest,
  stepNo = 4,
): Promise<SessionWizardBanner> {
  const formData = new FormData()
  if (payload.bannerFile) {
    formData.append("file", payload.bannerFile)
  }
  formData.append("clearBanner", String(payload.clearBanner))

  const res = await client.post<unknown>(API_ROUTES.sessionWizardBanner(uniqueId), formData, {
    params: { stepNo },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
  const responseData = parseServicePayload(res.data)
  const banner = sessionBannerSchema.parse(responseData)

  return {
    uniqueId: banner.UniqueId ?? banner.uniqueId ?? "",
    bannerUrl: banner.BannerUrl ?? banner.bannerUrl ?? null,
    stepNo: banner.StepNo ?? banner.stepNo ?? stepNo,
  }
}

export async function fetchSessionWizardQuestions(uniqueId: string): Promise<SessionWizardQuestionsInfo> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardQuestions(uniqueId))
  const responseData = parseServicePayload(res.data)
  const questions = sessionQuestionsInfoSchema.parse(responseData)

  return mapSessionQuestionsInfo(questions, 12)
}

export async function updateSessionWizardQuestions(
  uniqueId: string,
  payload: SessionWizardQuestionsRequest,
  stepNo = 12,
): Promise<SessionWizardQuestionsInfo> {
  const requestPayload = {
    customFormUniqueIds: payload.customFormUniqueIds,
    customQuestions: payload.customQuestions?.map(serializeQuestionForRequest) ?? null,
  }

  const res = await client.post<unknown>(API_ROUTES.sessionWizardQuestions(uniqueId), requestPayload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const questions = sessionQuestionsInfoSchema.parse(responseData)

  return mapSessionQuestionsInfo(questions, stepNo)
}

export async function fetchSessionWizardGenres(uniqueId: string): Promise<SessionWizardGenre[]> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardGenre(uniqueId))
  const responseData = parseServicePayload(res.data)
  const genres = sessionGenreListSchema.parse(responseData)

  return genres.map((genre) => ({
    uniqueId: genre.UniqueId ?? genre.uniqueId ?? "",
    name: genre.Name ?? genre.name ?? "",
    isSystem: genre.IsSystem ?? genre.isSystem ?? false,
    isSelected: genre.IsSelected ?? genre.isSelected ?? false,
  }))
}

export async function updateSessionWizardGenres(
  uniqueId: string,
  payload: SessionWizardGenreRequest,
  stepNo = 3,
): Promise<SessionWizardGenre[]> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardGenre(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const genres = sessionGenreListSchema.parse(responseData)

  return genres.map((genre) => ({
    uniqueId: genre.UniqueId ?? genre.uniqueId ?? "",
    name: genre.Name ?? genre.name ?? "",
    isSystem: genre.IsSystem ?? genre.isSystem ?? false,
    isSelected: genre.IsSelected ?? genre.isSelected ?? false,
  }))
}

export async function createSessionWizardGenre(
  uniqueId: string,
  payload: SessionWizardGenreCreateRequest,
): Promise<SessionWizardGenre> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardGenreCreate(uniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const genre = sessionGenreSchema.parse(responseData)

  return {
    uniqueId: genre.UniqueId ?? genre.uniqueId ?? "",
    name: genre.Name ?? genre.name ?? "",
    isSystem: genre.IsSystem ?? genre.isSystem ?? false,
    isSelected: genre.IsSelected ?? genre.isSelected ?? false,
  }
}

export async function skipSessionWizardStep(uniqueId: string, stepNo: number): Promise<SessionWizardProgressResponse> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardSkip(uniqueId), null, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  return sessionProgressSchema.parse(responseData)
}

export async function fetchSessionWizardEvent(uniqueId: string): Promise<SessionWizardEvent> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardEvent(uniqueId))
  const responseData = parseServicePayload(res.data)
  const sessionEvent = sessionEventSchema.parse(responseData)

  return {
    eventUniqueId: sessionEvent.EventUniqueId ?? sessionEvent.eventUniqueId ?? "",
  }
}

export async function updateSessionWizardEvent(
  uniqueId: string,
  payload: SessionWizardEventRequest,
  stepNo = 5,
): Promise<SessionWizardEvent> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardEvent(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const sessionEvent = sessionEventSchema.parse(responseData)

  return {
    eventUniqueId: sessionEvent.EventUniqueId ?? sessionEvent.eventUniqueId ?? "",
  }
}

export async function fetchSessionWizardVenue(uniqueId: string): Promise<SessionWizardVenue> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardVenue(uniqueId))
  const responseData = parseServicePayload(res.data)
  const venue = sessionVenueSchema.parse(responseData)

  return {
    venueUniqueId: venue.VenueUniqueId ?? venue.venueUniqueId ?? "",
  }
}

export async function updateSessionWizardVenue(
  uniqueId: string,
  payload: SessionWizardVenueRequest,
  stepNo = 6,
): Promise<SessionWizardVenue> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardVenue(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const venue = sessionVenueSchema.parse(responseData)

  return {
    venueUniqueId: venue.VenueUniqueId ?? venue.venueUniqueId ?? "",
  }
}

export async function fetchSessionWizardSeatSelection(uniqueId: string): Promise<SessionWizardSeatSelection> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardSeatSelection(uniqueId))
  const responseData = parseServicePayload(res.data)
  const seatSelection = sessionSeatSelectionSchema.parse(responseData)

  return {
    offerPickingSeats: seatSelection.OfferPickingSeats ?? seatSelection.offerPickingSeats ?? false,
    seatsIoEventUniqueId: seatSelection.SeatsIoEventUniqueId ?? seatSelection.seatsIoEventUniqueId ?? null,
    seatsIoChartUniqueId: seatSelection.SeatsIoChartUniqueId ?? seatSelection.seatsIoChartUniqueId ?? null,
    seatsIoChartName: seatSelection.SeatsIoChartName ?? seatSelection.seatsIoChartName ?? null,
    seatsIoEventLabel: seatSelection.SeatsIoEventLabel ?? seatSelection.seatsIoEventLabel ?? null,
  }
}

export async function fetchSessionWizardMembershipAccess(uniqueId: string): Promise<SessionWizardMembershipAccess> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardMembershipAccess(uniqueId))
  const responseData = parseServicePayload(res.data)
  const access = sessionMembershipAccessSchema.parse(responseData)
  const memberships = access.Memberships ?? access.memberships ?? []

  return {
    isRestricted: (access.IsRestricted ?? access.isRestricted ?? false) && memberships.length > 0,
    memberships: memberships
      .map((item) => ({
        membershipTypeUniqueId: item.MembershipTypeUniqueId ?? item.membershipTypeUniqueId ?? "",
        membershipTypeName: item.MembershipTypeName ?? item.membershipTypeName ?? "",
        discountType: item.DiscountType ?? item.discountType ?? null,
        discountValue: normalizeNullableNumber(item.DiscountValue ?? item.discountValue),
        maxDiscountAmount: normalizeNullableNumber(item.MaxDiscountAmount ?? item.maxDiscountAmount),
      }))
      .filter((item) => item.membershipTypeUniqueId.length > 0),
  }
}

export async function updateSessionWizardMembershipAccess(
  uniqueId: string,
  payload: SessionWizardMembershipAccessRequest,
  stepNo = 7,
): Promise<SessionWizardMembershipAccess> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardMembershipAccess(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const access = sessionMembershipAccessSchema.parse(responseData)
  const memberships = access.Memberships ?? access.memberships ?? []

  return {
    isRestricted: (access.IsRestricted ?? access.isRestricted ?? false) && memberships.length > 0,
    memberships: memberships
      .map((item) => ({
        membershipTypeUniqueId: item.MembershipTypeUniqueId ?? item.membershipTypeUniqueId ?? "",
        membershipTypeName: item.MembershipTypeName ?? item.membershipTypeName ?? "",
        discountType: item.DiscountType ?? item.discountType ?? null,
        discountValue: normalizeNullableNumber(item.DiscountValue ?? item.discountValue),
        maxDiscountAmount: normalizeNullableNumber(item.MaxDiscountAmount ?? item.maxDiscountAmount),
      }))
      .filter((item) => item.membershipTypeUniqueId.length > 0),
  }
}

export async function updateSessionWizardSeatSelection(
  uniqueId: string,
  payload: SessionWizardSeatSelectionRequest,
  stepNo = 8,
): Promise<SessionWizardSeatSelection> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardSeatSelection(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const seatSelection = sessionSeatSelectionSchema.parse(responseData)

  return {
    offerPickingSeats: seatSelection.OfferPickingSeats ?? seatSelection.offerPickingSeats ?? false,
    seatsIoEventUniqueId: seatSelection.SeatsIoEventUniqueId ?? seatSelection.seatsIoEventUniqueId ?? null,
    seatsIoChartUniqueId: seatSelection.SeatsIoChartUniqueId ?? seatSelection.seatsIoChartUniqueId ?? null,
    seatsIoChartName: seatSelection.SeatsIoChartName ?? seatSelection.seatsIoChartName ?? null,
    seatsIoEventLabel: seatSelection.SeatsIoEventLabel ?? seatSelection.seatsIoEventLabel ?? null,
  }
}

export async function fetchSessionWizardDateTime(uniqueId: string): Promise<SessionWizardDateTime> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardDateTime(uniqueId))
  const responseData = parseServicePayload(res.data)
  const dateTime = sessionDateTimeSchema.parse(responseData)

  return {
    bookingStartDate: dateTime.BookingStartDate ?? dateTime.bookingStartDate ?? null,
    bookingEndDate: dateTime.BookingEndDate ?? dateTime.bookingEndDate ?? null,
    startDate: dateTime.StartDate ?? dateTime.startDate ?? null,
    endDate: dateTime.EndDate ?? dateTime.endDate ?? null,
    stepNo: dateTime.StepNo ?? dateTime.stepNo ?? 0,
  }
}

export async function updateSessionWizardDateTime(
  uniqueId: string,
  payload: SessionWizardDateTimeRequest,
  stepNo = 9,
): Promise<SessionWizardDateTime> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardDateTime(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const dateTime = sessionDateTimeSchema.parse(responseData)

  return {
    bookingStartDate: dateTime.BookingStartDate ?? dateTime.bookingStartDate ?? null,
    bookingEndDate: dateTime.BookingEndDate ?? dateTime.bookingEndDate ?? null,
    startDate: dateTime.StartDate ?? dateTime.startDate ?? null,
    endDate: dateTime.EndDate ?? dateTime.endDate ?? null,
    stepNo: dateTime.StepNo ?? dateTime.stepNo ?? stepNo,
  }
}

export async function fetchSessionWizardBooking(uniqueId: string): Promise<SessionWizardBooking> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardBooking(uniqueId))
  const responseData = parseServicePayload(res.data)
  const booking = sessionBookingSchema.parse(responseData)

  return {
    bookingStartDate: booking.BookingStartDate ?? booking.bookingStartDate ?? null,
    bookingEndDate: booking.BookingEndDate ?? booking.bookingEndDate ?? null,
  }
}

export async function updateSessionWizardBooking(
  uniqueId: string,
  payload: SessionWizardBookingRequest,
  stepNo = 9,
): Promise<SessionWizardBooking> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardBooking(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const booking = sessionBookingSchema.parse(responseData)

  return {
    bookingStartDate: booking.BookingStartDate ?? booking.bookingStartDate ?? null,
    bookingEndDate: booking.BookingEndDate ?? booking.bookingEndDate ?? null,
  }
}

export async function fetchSessionWizardDuration(uniqueId: string): Promise<SessionWizardDuration> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardDuration(uniqueId))
  const responseData = parseServicePayload(res.data)
  const duration = sessionDurationSchema.parse(responseData)

  return {
    startDate: duration.StartDate ?? duration.startDate ?? null,
    endDate: duration.EndDate ?? duration.endDate ?? null,
  }
}

export async function updateSessionWizardDuration(
  uniqueId: string,
  payload: SessionWizardDurationRequest,
  stepNo = 9,
): Promise<SessionWizardDuration> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardDuration(uniqueId), payload, {
    params: { stepNo },
  })
  const responseData = parseServicePayload(res.data)
  const duration = sessionDurationSchema.parse(responseData)

  return {
    startDate: duration.StartDate ?? duration.startDate ?? null,
    endDate: duration.EndDate ?? duration.endDate ?? null,
  }
}

export async function markSessionWizardReadyForReview(uniqueId: string): Promise<SessionWizardSetupState> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardSetupStateReview(uniqueId))
  const responseData = parseServicePayload(res.data)
  const setupState = sessionSetupStateSchema.parse(responseData)

  return {
    setupState: setupState.SetupState ?? setupState.setupState ?? "",
  }
}

export async function fetchSessionWizardSetupState(uniqueId: string): Promise<SessionWizardSetupState> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardSetupState(uniqueId))
  const responseData = parseServicePayload(res.data)
  const setupState = sessionSetupStateSchema.parse(responseData)

  return {
    setupState: setupState.SetupState ?? setupState.setupState ?? "",
  }
}

export async function updateSessionWizardSetupState(
  uniqueId: string,
  payload: SessionWizardSetupStateRequest,
): Promise<SessionWizardSetupState> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardSetupState(uniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const setupState = sessionSetupStateSchema.parse(responseData)

  return {
    setupState: setupState.SetupState ?? setupState.setupState ?? "",
  }
}

export async function fetchSessionWizardSetupStateOptions(): Promise<SessionWizardSetupStateOption[]> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardSetupStateOptions)
  const responseData = parseServicePayload(res.data)
  const setupStateOptions = z.array(sessionSetupStateOptionSchema).parse(responseData)

  return parseSessionSetupStateOptions(setupStateOptions)
}

function parseSessionSetupStateOptions(
  setupStateOptions: z.infer<typeof sessionSetupStateOptionSchema>[],
): SessionWizardSetupStateOption[] {
  return setupStateOptions.map((option) => ({
    value: option.Value ?? option.value ?? "",
    label: option.Label ?? option.label ?? "",
    isSelectable: option.IsSelectable ?? option.isSelectable ?? false,
    isFinal: option.IsFinal ?? option.isFinal ?? false,
  }))
}

export async function fetchSessionWizardReviewSummary(uniqueId: string): Promise<SessionReviewSummary> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardReviewSummary(uniqueId))
  const responseData = parseServicePayload(res.data)
  const summary = sessionReviewSummarySchema.parse(responseData)

  const genres = (summary.Genres ?? summary.genres ?? []).map((genre) => ({
    uniqueId: genre.UniqueId ?? genre.uniqueId ?? "",
    name: genre.Name ?? genre.name ?? "",
    isSystem: genre.IsSystem ?? genre.isSystem ?? false,
    isSelected: genre.IsSelected ?? genre.isSelected ?? false,
  }))

  const membershipAccessItems = (summary.MembershipAccess?.Memberships ?? summary.MembershipAccess?.memberships ?? []).map(
    (item) => ({
      membershipTypeUniqueId: item.MembershipTypeUniqueId ?? item.membershipTypeUniqueId ?? "",
      membershipTypeName: item.MembershipTypeName ?? item.membershipTypeName ?? "",
      discountType: item.DiscountType ?? item.discountType ?? null,
      discountValue: normalizeNullableNumber(item.DiscountValue ?? item.discountValue),
      maxDiscountAmount: normalizeNullableNumber(item.MaxDiscountAmount ?? item.maxDiscountAmount),
    }),
  )

  const booking = summary.Booking ?? summary.booking
  const duration = summary.Duration ?? summary.duration
  const questions = summary.Questions ?? summary.questions
  const seatSelection = summary.SeatSelection ?? summary.seatSelection
  const eTicketing = summary.ETicketing ?? summary.eTicketing
  const setupStateOptions = parseSessionSetupStateOptions(summary.SetupStateOptions ?? summary.setupStateOptions ?? [])

  return {
    name: summary.Name ?? summary.name ?? "",
    eventName: summary.EventName ?? summary.eventName ?? null,
    venueName: summary.VenueName ?? summary.venueName ?? null,
    genres,
    membershipAccess: {
      isRestricted: membershipAccessItems.length > 0,
      memberships: membershipAccessItems,
    },
    seatSelection: {
      offerPickingSeats: seatSelection?.OfferPickingSeats ?? seatSelection?.offerPickingSeats ?? false,
      seatsIoEventUniqueId: seatSelection?.SeatsIoEventUniqueId ?? seatSelection?.seatsIoEventUniqueId ?? null,
      seatsIoChartUniqueId: seatSelection?.SeatsIoChartUniqueId ?? seatSelection?.seatsIoChartUniqueId ?? null,
      seatsIoChartName: seatSelection?.SeatsIoChartName ?? seatSelection?.seatsIoChartName ?? null,
      seatsIoEventLabel: seatSelection?.SeatsIoEventLabel ?? seatSelection?.seatsIoEventLabel ?? null,
    },
    booking: {
      bookingStartDate: booking?.BookingStartDate ?? booking?.bookingStartDate ?? null,
      bookingEndDate: booking?.BookingEndDate ?? booking?.bookingEndDate ?? null,
    },
    duration: {
      startDate: duration?.StartDate ?? duration?.startDate ?? null,
      endDate: duration?.EndDate ?? duration?.endDate ?? null,
    },
    questions: mapSessionQuestionsInfo(questions ?? ({} as z.infer<typeof sessionQuestionsInfoSchema>), 0),
    eTicketing: {
      enableDigitalTicket: eTicketing?.EnableDigitalTicket ?? eTicketing?.enableDigitalTicket ?? false,
      requiresAttendeeInfo: eTicketing?.RequiresAttendeeInfo ?? eTicketing?.requiresAttendeeInfo ?? false,
    },
    scheduleCount: summary.ScheduleCount ?? summary.scheduleCount ?? 0,
    ticketCount: summary.TicketCount ?? summary.ticketCount ?? 0,
    setupState: summary.SetupState ?? summary.setupState ?? "",
    setupStateOptions,
  }
}

export async function fetchSessionWizardETicketing(uniqueId: string): Promise<SessionWizardETicketing> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardETicketing(uniqueId))
  const responseData = parseServicePayload(res.data)
  const ticketing = sessionETicketingSchema.parse(responseData)

  return {
    enableDigitalTicket: ticketing.EnableDigitalTicket ?? ticketing.enableDigitalTicket ?? false,
    requiresAttendeeInfo: ticketing.RequiresAttendeeInfo ?? ticketing.requiresAttendeeInfo ?? false,
  }
}

export async function updateSessionWizardETicketing(
  uniqueId: string,
  payload: SessionWizardETicketingRequest,
): Promise<SessionWizardETicketing> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardETicketing(uniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const ticketing = sessionETicketingSchema.parse(responseData)

  return {
    enableDigitalTicket: ticketing.EnableDigitalTicket ?? ticketing.enableDigitalTicket ?? false,
    requiresAttendeeInfo: ticketing.RequiresAttendeeInfo ?? ticketing.requiresAttendeeInfo ?? false,
  }
}

export async function fetchSessionWizardSchedule(uniqueId: string): Promise<SessionWizardSchedule[]> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardSchedule(uniqueId))
  const responseData = parseServicePayload(res.data)
  const schedules = sessionScheduleListSchema.parse(responseData)

  return schedules.map((schedule) => ({
    uniqueId: schedule.UniqueId ?? schedule.uniqueId ?? "",
    name: schedule.Name ?? schedule.name ?? "",
    scheduleTime: normalizeScheduleTime(schedule.ScheduleTime ?? schedule.scheduleTime),
  }))
}

export async function createSessionWizardSchedule(
  uniqueId: string,
  payload: SessionWizardScheduleRequest,
): Promise<SessionWizardSchedule> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardSchedule(uniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const schedule = sessionScheduleSchema.parse(responseData)

  return {
    uniqueId: schedule.UniqueId ?? schedule.uniqueId ?? "",
    name: schedule.Name ?? schedule.name ?? "",
    scheduleTime: normalizeScheduleTime(schedule.ScheduleTime ?? schedule.scheduleTime),
  }
}

export async function updateSessionWizardSchedule(
  uniqueId: string,
  scheduleUniqueId: string,
  payload: SessionWizardScheduleRequest,
): Promise<SessionWizardSchedule> {
  const res = await client.put<unknown>(API_ROUTES.sessionWizardScheduleItem(uniqueId, scheduleUniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const schedule = sessionScheduleSchema.parse(responseData)

  return {
    uniqueId: schedule.UniqueId ?? schedule.uniqueId ?? "",
    name: schedule.Name ?? schedule.name ?? "",
    scheduleTime: normalizeScheduleTime(schedule.ScheduleTime ?? schedule.scheduleTime),
  }
}

export async function deleteSessionWizardSchedule(uniqueId: string, scheduleUniqueId: string): Promise<void> {
  await client.delete(API_ROUTES.sessionWizardScheduleItem(uniqueId, scheduleUniqueId))
}

export async function fetchSessionWizardTickets(uniqueId: string): Promise<SessionWizardTicket[]> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardTicket(uniqueId))
  const responseData = parseServicePayload(res.data)
  const tickets = sessionTicketListSchema.parse(responseData)

  return tickets.map((ticket) => ({
    uniqueId: ticket.UniqueId ?? ticket.uniqueId ?? "",
    name: ticket.Name ?? ticket.name ?? "",
    description: ticket.Description ?? ticket.description ?? null,
    seatsIoChartCategoryId: ticket.SeatsIoChartCategoryId ?? ticket.seatsIoChartCategoryId ?? null,
    totalQuantity: ticket.TotalQuantity ?? ticket.totalQuantity ?? null,
    fullPrice: normalizeTicketPrice(ticket.FullPrice ?? ticket.fullPrice),
    minPurchase: ticket.MinPurchase ?? ticket.minPurchase ?? null,
    maxPurchase: ticket.MaxPurchase ?? ticket.maxPurchase ?? null,
    isActive: ticket.IsActive ?? ticket.isActive ?? false,
    displayOrder: ticket.DisplayOrder ?? ticket.displayOrder ?? 0,
    pricePeriods: (ticket.PricePeriods ?? ticket.pricePeriods ?? [])
      .map((period) => ({
        uniqueId: period.UniqueId ?? period.uniqueId ?? "",
        name: period.Name ?? period.name ?? null,
        amount: normalizeTicketPrice(period.Amount ?? period.amount),
        startDateTime: normalizeDateTime(period.StartDateTime ?? period.startDateTime),
        endDateTime: normalizeDateTime(period.EndDateTime ?? period.endDateTime),
        currentStatus: period.CurrentStatus ?? period.currentStatus ?? "",
      }))
      .filter((period) => !!period.uniqueId),
  }))
}

export async function createSessionWizardTicket(
  uniqueId: string,
  payload: SessionWizardTicketRequest,
): Promise<SessionWizardTicket> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardTicket(uniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const ticket = sessionTicketSchema.parse(responseData)

  return {
    uniqueId: ticket.UniqueId ?? ticket.uniqueId ?? "",
    name: ticket.Name ?? ticket.name ?? "",
    description: ticket.Description ?? ticket.description ?? null,
    seatsIoChartCategoryId: ticket.SeatsIoChartCategoryId ?? ticket.seatsIoChartCategoryId ?? null,
    totalQuantity: ticket.TotalQuantity ?? ticket.totalQuantity ?? null,
    fullPrice: normalizeTicketPrice(ticket.FullPrice ?? ticket.fullPrice),
    minPurchase: ticket.MinPurchase ?? ticket.minPurchase ?? null,
    maxPurchase: ticket.MaxPurchase ?? ticket.maxPurchase ?? null,
    isActive: ticket.IsActive ?? ticket.isActive ?? false,
    displayOrder: ticket.DisplayOrder ?? ticket.displayOrder ?? 0,
    pricePeriods: [],
  }
}

export async function updateSessionWizardTicket(
  uniqueId: string,
  ticketUniqueId: string,
  payload: SessionWizardTicketRequest,
): Promise<SessionWizardTicket> {
  const res = await client.put<unknown>(API_ROUTES.sessionWizardTicketItem(uniqueId, ticketUniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const ticket = sessionTicketSchema.parse(responseData)

  return {
    uniqueId: ticket.UniqueId ?? ticket.uniqueId ?? "",
    name: ticket.Name ?? ticket.name ?? "",
    description: ticket.Description ?? ticket.description ?? null,
    seatsIoChartCategoryId: ticket.SeatsIoChartCategoryId ?? ticket.seatsIoChartCategoryId ?? null,
    totalQuantity: ticket.TotalQuantity ?? ticket.totalQuantity ?? null,
    fullPrice: normalizeTicketPrice(ticket.FullPrice ?? ticket.fullPrice),
    minPurchase: ticket.MinPurchase ?? ticket.minPurchase ?? null,
    maxPurchase: ticket.MaxPurchase ?? ticket.maxPurchase ?? null,
    isActive: ticket.IsActive ?? ticket.isActive ?? false,
    displayOrder: ticket.DisplayOrder ?? ticket.displayOrder ?? 0,
    pricePeriods: [],
  }
}

export async function deleteSessionWizardTicket(uniqueId: string, ticketUniqueId: string): Promise<void> {
  await client.delete(API_ROUTES.sessionWizardTicketItem(uniqueId, ticketUniqueId))
}

export async function updateSessionWizardTicketDisplayOrder(
  uniqueId: string,
  payload: SessionWizardTicketDisplayOrderRequest,
): Promise<void> {
  await client.post(API_ROUTES.sessionWizardTicketDisplayOrder(uniqueId), payload)
}

export async function createSessionWizardTicketPricePeriod(
  uniqueId: string,
  ticketUniqueId: string,
  payload: SessionWizardTicketPricePeriodRequest,
): Promise<SessionWizardTicketPricePeriod> {
  const res = await client.post<unknown>(API_ROUTES.sessionWizardTicketPricePeriod(uniqueId, ticketUniqueId), payload)
  const responseData = parseServicePayload(res.data)
  const period = z
    .object({
      UniqueId: z.string().optional(),
      uniqueId: z.string().optional(),
      Name: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      Amount: z.union([z.number(), z.string()]).optional(),
      amount: z.union([z.number(), z.string()]).optional(),
      StartDateTime: z.string().optional(),
      startDateTime: z.string().optional(),
      EndDateTime: z.string().optional(),
      endDateTime: z.string().optional(),
      CurrentStatus: z.string().optional(),
      currentStatus: z.string().optional(),
    })
    .parse(responseData)

  return {
    uniqueId: period.UniqueId ?? period.uniqueId ?? "",
    name: period.Name ?? period.name ?? null,
    amount: normalizeTicketPrice(period.Amount ?? period.amount),
    startDateTime: normalizeDateTime(period.StartDateTime ?? period.startDateTime),
    endDateTime: normalizeDateTime(period.EndDateTime ?? period.endDateTime),
    currentStatus: period.CurrentStatus ?? period.currentStatus ?? "",
  }
}

export async function updateSessionWizardTicketPricePeriod(
  uniqueId: string,
  ticketUniqueId: string,
  pricePeriodUniqueId: string,
  payload: SessionWizardTicketPricePeriodRequest,
): Promise<SessionWizardTicketPricePeriod> {
  const res = await client.put<unknown>(
    API_ROUTES.sessionWizardTicketPricePeriodItem(uniqueId, ticketUniqueId, pricePeriodUniqueId),
    payload,
  )
  const responseData = parseServicePayload(res.data)
  const period = z
    .object({
      UniqueId: z.string().optional(),
      uniqueId: z.string().optional(),
      Name: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      Amount: z.union([z.number(), z.string()]).optional(),
      amount: z.union([z.number(), z.string()]).optional(),
      StartDateTime: z.string().optional(),
      startDateTime: z.string().optional(),
      EndDateTime: z.string().optional(),
      endDateTime: z.string().optional(),
      CurrentStatus: z.string().optional(),
      currentStatus: z.string().optional(),
    })
    .parse(responseData)

  return {
    uniqueId: period.UniqueId ?? period.uniqueId ?? "",
    name: period.Name ?? period.name ?? null,
    amount: normalizeTicketPrice(period.Amount ?? period.amount),
    startDateTime: normalizeDateTime(period.StartDateTime ?? period.startDateTime),
    endDateTime: normalizeDateTime(period.EndDateTime ?? period.endDateTime),
    currentStatus: period.CurrentStatus ?? period.currentStatus ?? "",
  }
}

export async function deleteSessionWizardTicketPricePeriod(
  uniqueId: string,
  ticketUniqueId: string,
  pricePeriodUniqueId: string,
): Promise<void> {
  await client.delete(API_ROUTES.sessionWizardTicketPricePeriodItem(uniqueId, ticketUniqueId, pricePeriodUniqueId))
}

export async function fetchSessionWizardProgress(uniqueId: string): Promise<SessionWizardProgressResponse> {
  const res = await client.get<unknown>(API_ROUTES.sessionWizardProgress(uniqueId))
  const responseData = parseServicePayload(res.data)
  return sessionProgressSchema.parse(responseData)
}

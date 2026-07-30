import type { EventRegistrationPaymentMethod, EventRegistrationSession, EventRegistrationTicket } from "@/api/events"

export type WizardTabId =
  | "description"
  | "sessions"
  | "buyer-attendee-info"
  | "attendee-info"
  | "questionnaire"
  | "payment"

export type PurchaseReviewValidationTarget =
  | "buyer-attendee-info"
  | "payment-method"
  | "payment-card"
  | "terms"
  | "refund-policy"

export interface PurchaseReviewIssue {
  message: string
  target: PurchaseReviewValidationTarget
}

export interface BuyerAttendeeInfoState {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type AttendeeSlotState = BuyerAttendeeInfoState

export const EMPTY_BUYER_INFO: BuyerAttendeeInfoState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
}

export interface SelectedSessionSummary {
  session: EventRegistrationSession
  selectedTickets: Array<{
    ticket: EventRegistrationTicket
    quantity: number
  }>
  attendeeCount: number
  requiresAttendeeInfo: boolean
  hasQuestions: boolean
}

export interface AttendeeTicketGroup {
  key: string
  sessionId: string
  sessionName: string
  ticketId: string
  ticketName: string
  attendeeCount: number
  requiresAttendeeInfo: boolean
  hasQuestions: boolean
  slots: Array<{
    key: string
    attendeeLabel: string
  }>
}

export interface AttendeeSessionGroup {
  key: string
  sessionId: string
  sessionName: string
  attendeeCount: number
  requiresAttendeeInfo: boolean
  hasQuestions: boolean
  tickets: AttendeeTicketGroup[]
}

export interface AttendeeSlotEntry {
  key: string
  sessionId: string
  sessionName: string
  ticketId: string
  ticketName: string
  attendeeLabel: string
  requiresAttendeeInfo: boolean
  hasQuestions: boolean
}

export interface BannerSlide {
  imageUrl: string
}

export interface SelectedTicketSummaryItem {
  sessionId: string
  sessionName: string
  ticketId: string
  ticketName: string
  ticket: EventRegistrationTicket
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type PendingDeleteAction =
  | {
      kind: "ticket"
      ticket: EventRegistrationTicket
      title: string
      description: string
    }
  | {
      kind: "session"
      items: SelectedTicketSummaryItem[]
      title: string
      description: string
    }
  | {
      kind: "all"
      title: string
      description: string
    }

export interface EventRegisterWizardEvent {
  uniqueId: string
  title: string
  bannerUrl: string | null
  themeColor: string | null
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
  purchaseTimeLimitMinutes: number
  description: string | null
  summary: string | null
  termsConditions: string | null
  refundPolicy: string | null
  location: string
  locationMapUrl: string | null
  organizer: string
  timeZone: string | null
  registrationStatus: string
  canRegister: boolean
  registrationBlockedReason: string | null
  isOrganizer: boolean
  paymentAccountCurrency: string | null
  paymentAccountUniqueId: string | null
  paymentMethods: EventRegistrationPaymentMethod[]
  sessions: EventRegistrationSession[]
  visibleTabs?: string[]
}

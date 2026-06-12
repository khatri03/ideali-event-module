export type EventCategory =
  | "conference"
  | "workshop"
  | "seminar"
  | "concert"
  | "sports"
  | "networking"
  | "webinar"
  | "hackathon"
  | "other"

export type EventStatus = "draft" | "published" | "ongoing" | "completed" | "cancelled"
export type EventVisibility = "Public" | "Member" | "Invitation"

export interface EventSession {
  title: string
  startsAt: string
  endsAt: string
}

export interface AppEvent {
  id: string
  title: string
  description: string
  termsConditions?: string | null
  bannerUrl?: string | null
  discountsEnabled?: boolean
  startDate: string
  endDate: string
  location: string
  category: EventCategory
  status: EventStatus
  capacity: number
  attendees: number
  organizer: string
  coverColor: string
  visibility?: EventVisibility
  price: number
  currency: string
  tags: string[]
  timeZone?: string
  paymentAccountId?: string
  venueUniqueId?: string
  purchaseTimeLimitHours?: number | null
  sessions?: EventSession[]
}

export interface StatItem {
  label: string
  value: string
  change: number
  changeType: "increase" | "decrease"
  iconBg: string
}

export interface ChartDataPoint {
  month: string
  events: number
  attendees: number
}

export interface CategoryDataPoint {
  name: string
  value: number
  color: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
}

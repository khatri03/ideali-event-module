export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ServiceResponse<T> {
  success: boolean
  message: string | null
  errorCode?: string | null
  validationErrors?: Record<string, string[]> | null
  meta?: Record<string, unknown> | null
  timestamp: string
  data: T | null
}

export interface LoginRequest {
  userName: string
  password: string
}

export interface AuthUserDetail {
  userId: number
  roles: string[] | null
  email: string
  name: string
  logoUrl: string | null
}

export interface OrganizerProfile {
  name: string
  uniqueId: string
}

export interface OrganizerPaymentAccount {
  name: string
  uniqueId: string
  stripeAccountNo: string | null
  stripePublishableKey: string | null
}

export interface AuthOrganizerDetail {
  organizerId: number
  organizerUniqueId: string
  name: string | null
  email: string | null
  emailBrandingEnabled: boolean
  profiles: OrganizerProfile[] | null
  paymentAccounts: OrganizerPaymentAccount[] | null
}

export interface AuthSessionData {
  userDetail: AuthUserDetail
  organizerDetail: AuthOrganizerDetail
}

export interface TwoFactorChallengeData {
  requiresTwoFactor: true
  twoFaToken: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

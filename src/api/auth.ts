import { z } from "zod"
import { client } from "@/api/client"
import { API_AUTH_ROUTES } from "@/utils/routes"
import type {
  AuthSessionData,
  LoginRequest,
  ServiceResponse,
  TwoFactorChallengeData,
} from "@/api/types"

const authUserSchema = z.object({
  userId: z.number(),
  roles: z.array(z.string()).nullable(),
  email: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
})

const organizerProfileSchema = z.object({
  name: z.string(),
  uniqueId: z.string(),
})

const organizerPaymentAccountSchema = z.object({
  name: z.string(),
  uniqueId: z.string(),
  stripeAccountNo: z.string().nullable(),
  stripePublishableKey: z.string().nullable(),
})

const authOrganizerSchema = z.object({
  organizerId: z.number(),
  organizerUniqueId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailBrandingEnabled: z.boolean(),
  profiles: z.array(organizerProfileSchema).nullable(),
  paymentAccounts: z.array(organizerPaymentAccountSchema).nullable(),
})

const authSessionSchema = z.object({
  userDetail: authUserSchema,
  organizerDetail: authOrganizerSchema,
})

const twoFactorChallengeSchema = z.object({
  requiresTwoFactor: z.literal(true),
  twoFaToken: z.string(),
})

const serviceResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable(),
  errorCode: z.string().nullable().optional(),
  validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  timestamp: z.string(),
})

type AuthOutcome = AuthSessionData | TwoFactorChallengeData

async function postForm(path: string, values: Record<string, string>) {
  const body = new URLSearchParams(values)
  const res = await client.post<unknown>(path, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
  return res.data
}

function parseServiceResponse<T extends z.ZodTypeAny>(
  payload: unknown,
  dataSchema: T
): z.infer<T> {
  const serviceResponse = serviceResponseSchema.extend({
    data: dataSchema.nullable(),
  }).parse(payload) as ServiceResponse<z.infer<T>>

  if (!serviceResponse.success || !serviceResponse.data) {
    throw new Error(serviceResponse.message ?? "An unexpected error occurred.")
  }

  return serviceResponse.data
}

function parseAuthOutcome(payload: unknown): AuthOutcome {
  return parseServiceResponse(payload, z.union([authSessionSchema, twoFactorChallengeSchema]))
}

function parseAuthSession(payload: unknown): AuthSessionData {
  return parseServiceResponse(payload, authSessionSchema)
}

function withCookieFlag(path: string) {
  return `${path}${path.includes("?") ? "&" : "?"}useCookie=true`
}

export async function loginUser(payload: LoginRequest): Promise<AuthOutcome> {
  const response = await postForm(withCookieFlag(API_AUTH_ROUTES.authenticate), {
    userName: payload.userName,
    password: payload.password,
  })
  return parseAuthOutcome(response)
}

export async function refreshSession(): Promise<void> {
  await client.post(withCookieFlag(API_AUTH_ROUTES.refreshToken))
}

export async function fetchCurrentSession(): Promise<AuthSessionData> {
  const response = await client.get<unknown>(API_AUTH_ROUTES.session)
  return parseAuthSession(response.data)
}

export async function verifyTwoFactor(twoFaToken: string, emailCode: string): Promise<AuthSessionData> {
  const response = await client.post<unknown>(
    withCookieFlag(`${API_AUTH_ROUTES.twoFactorPrefix}${twoFaToken}/verify`),
    { emailCode }
  )

  return parseAuthSession(response.data)
}

export async function logoutUser(): Promise<void> {
  await client.post(API_AUTH_ROUTES.logout)
}

import { isAxiosError } from "axios"
import { ZodError } from "zod"
import { ServiceResponseError } from "@/api/serviceResponse"
import { TurnstileError } from "@/lib/turnstile"

interface ProblemDetails {
  title: string
  status: number
  detail?: string
  errors?: Record<string, string[]>
  message?: string
}

/**
 * The HTTP status behind a failure, when there was one. Callers use it to tell a request that will never
 * succeed from one worth retrying - never to show the number, which says nothing to the person reading.
 */
export function httpStatusOf(err: unknown): number | null {
  return isAxiosError(err) ? (err.response?.status ?? null) : null
}

export function isNotFoundError(err: unknown): boolean {
  return httpStatusOf(err) === 404
}

/** The API spells its failure envelope PascalCase, and an error body never passes through camelizeKeys. */
interface ServiceFailureBody {
  ErrorCode?: string
  errorCode?: string
}

const CART_CAPABILITY_ERROR_CODE = "cart_capability_required"

/**
 * The cart's capability cookie no longer reaches the server - it was never sent, it expired, or it
 * belongs to a different cart. Every later call on that cart is refused identically, so the session is
 * over: the caller must start again rather than retry.
 */
export function isCartSessionLostError(err: unknown): boolean {
  if (httpStatusOf(err) !== 403 || !isAxiosError(err)) return false

  const body = err.response?.data as ServiceFailureBody | undefined
  return (body?.ErrorCode ?? body?.errorCode) === CART_CAPABILITY_ERROR_CODE
}

export function extractApiError(err: unknown): string {
  // Raised before the request leaves the browser, so it carries no server detail to leak.
  if (err instanceof TurnstileError || err instanceof ServiceResponseError) {
    return err.message
  }

  if (err instanceof ZodError) {
    return err.issues.map((issue) => issue.message).join(" ")
  }

  if (!isAxiosError(err)) return "An unexpected error occurred."

  const responseData = err.response?.data as
    | (ProblemDetails & { message?: string })
    | undefined

  if (responseData) {
    const validationErrors = responseData.errors
      ? Object.values(responseData.errors).flat().filter(Boolean)
      : []

    return (
      responseData.title ??
      responseData.detail ??
      responseData.message ??
      validationErrors[0] ??
      "An unexpected error occurred."
    )
  }

  if (err instanceof Error) {
    return err.message || "An unexpected error occurred."
  }

  return "An unexpected error occurred."
}

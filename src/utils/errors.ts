import { isAxiosError } from "axios"
import { ZodError } from "zod"
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

export function extractApiError(err: unknown): string {
  // Raised before the request leaves the browser, so it carries no server detail to leak.
  if (err instanceof TurnstileError) {
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

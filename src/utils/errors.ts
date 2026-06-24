import { isAxiosError } from "axios"
import { ZodError } from "zod"

interface ProblemDetails {
  title: string
  status: number
  detail?: string
  errors?: Record<string, string[]>
  message?: string
}

export function extractApiError(err: unknown): string {
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

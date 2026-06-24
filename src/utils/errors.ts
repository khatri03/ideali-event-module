import { isAxiosError } from "axios"
import { ZodError } from "zod"

interface ProblemDetails {
  title: string
  status: number
  errors?: Record<string, string[]>
}

export function extractApiError(err: unknown): string {
  if (err instanceof ZodError) {
    return err.issues.map((issue) => issue.message).join(" ")
  }

  if (err instanceof Error) {
    return err.message || "An unexpected error occurred."
  }

  if (!isAxiosError(err)) return "An unexpected error occurred."

  const responseData = err.response?.data as
    | (ProblemDetails & { message?: string })
    | undefined

  return responseData?.title ?? responseData?.message ?? "An unexpected error occurred."
}

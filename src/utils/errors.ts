import { isAxiosError } from "axios"

interface ProblemDetails {
  title: string
  status: number
  errors?: Record<string, string[]>
}

export function extractApiError(err: unknown): string {
  if (!isAxiosError(err)) return "An unexpected error occurred."

  const responseData = err.response?.data as
    | (ProblemDetails & { message?: string })
    | undefined

  return responseData?.title ?? responseData?.message ?? "An unexpected error occurred."
}

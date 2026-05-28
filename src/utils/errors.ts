import type { AxiosError } from "axios"

interface ProblemDetails {
  title: string
  status: number
  errors?: Record<string, string[]>
}

export function extractApiError(err: unknown): string {
  const axiosErr = err as AxiosError<ProblemDetails>
  return axiosErr.response?.data?.title ?? "An unexpected error occurred."
}

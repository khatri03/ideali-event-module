import { useQuery } from "@tanstack/react-query"
import { fetchSessionFilterOptions } from "@/api/sessions"
import { extractApiError } from "@/utils/errors"

export function useSessionFilterOptions() {
  const query = useQuery({
    queryKey: ["sessions", "filter-options"],
    queryFn: fetchSessionFilterOptions,
    retry: false,
    staleTime: 1000 * 60 * 30,
  })

  return {
    filterOptions: query.data ?? { genres: [], events: [], venues: [] },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.isError ? extractApiError(query.error) : "",
  }
}

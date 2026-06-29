import { useQuery } from "@tanstack/react-query"
import { fetchOrganizerEventStatusOptions } from "@/api/events"
import { extractApiError } from "@/utils/errors"

export function useOrganizerEventStatusOptions() {
  const query = useQuery({
    queryKey: ["organizer-event-status-options"],
    queryFn: fetchOrganizerEventStatusOptions,
    retry: false,
  })

  return {
    statusOptions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.isError ? extractApiError(query.error) : "",
  }
}

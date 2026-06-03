import { useQuery } from "@tanstack/react-query"
import { fetchOrganizerVenues } from "@/api/organizer"
import { extractApiError } from "@/utils/errors"

export function useOrganizerVenues() {
  const query = useQuery({
    queryKey: ["venues", { scope: "organizer" }],
    queryFn: fetchOrganizerVenues,
    retry: false,
  })

  return {
    venues: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    isError: query.isError,
    error: query.isError ? extractApiError(query.error) : "",
  }
}

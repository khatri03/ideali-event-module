import { useQuery } from "@tanstack/react-query"
import { fetchOrganizerVenues } from "@/api/organizer"

export function useChartLayoutVenues() {
  const query = useQuery({
    queryKey: ["chart-layouts", "venues"],
    queryFn: fetchOrganizerVenues,
    retry: false,
    refetchOnWindowFocus: false,
  })

  return {
    venues: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

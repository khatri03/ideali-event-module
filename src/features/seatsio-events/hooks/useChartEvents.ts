import { useQuery } from "@tanstack/react-query"
import { fetchSeatsIoChartEvents } from "@/api/seatsio"

export function useChartEvents(chartUniqueId: string) {
  return useQuery({
    queryKey: ["seatsio", "chart-events", chartUniqueId],
    queryFn: () => fetchSeatsIoChartEvents(chartUniqueId),
    enabled: Boolean(chartUniqueId),
    retry: false,
    refetchOnWindowFocus: false,
  })
}

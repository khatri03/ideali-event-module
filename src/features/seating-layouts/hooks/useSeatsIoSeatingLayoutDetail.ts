import { useQuery } from "@tanstack/react-query"
import { fetchSeatsIoSeatingLayoutDetail } from "@/api/seatsio"

export function useSeatsIoSeatingLayoutDetail(chartUniqueId: string, enabled = true) {
  return useQuery({
    queryKey: ["seatsio", "seating-layout-detail", { chartUniqueId }],
    queryFn: () => fetchSeatsIoSeatingLayoutDetail(chartUniqueId),
    enabled: enabled && Boolean(chartUniqueId.trim()),
    retry: false,
    refetchOnWindowFocus: false,
  })
}

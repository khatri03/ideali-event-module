import { useQuery } from "@tanstack/react-query"
import { fetchSeatsIoWorkspace } from "@/api/seatsio"

export function useSeatingLayoutWorkspace() {
  return useQuery({
    queryKey: ["seatsio", "workspace"],
    queryFn: fetchSeatsIoWorkspace,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
}

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchSeatsIoSeatingLayouts } from "@/api/seatsio"

export function useSeatingLayouts(pageNo: number, pageSize: number) {
  return useQuery({
    queryKey: ["seatsio", "seating-layouts", { pageNo, pageSize }],
    queryFn: () => fetchSeatsIoSeatingLayouts(pageNo, pageSize),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

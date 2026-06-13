import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchSeatsIoChartLayouts } from "@/api/seatsio"

export function useSeatsIoChartLayouts(pageNo: number, pageSize: number) {
  return useQuery({
    queryKey: ["seatsio", "chart-layouts", { pageNo, pageSize }],
    queryFn: () => fetchSeatsIoChartLayouts(pageNo, pageSize),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

import { useQuery } from "@tanstack/react-query"
import { fetchSeatsIoChartValidation } from "@/api/seatsio"

export function useSeatsIoChartValidation(chartKey: string | null | undefined) {
  const normalizedChartKey = chartKey?.trim() ?? ""

  return useQuery({
    queryKey: ["seatsio", "chart-validation", { chartKey: normalizedChartKey }],
    queryFn: () => fetchSeatsIoChartValidation(normalizedChartKey),
    enabled: Boolean(normalizedChartKey),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  })
}

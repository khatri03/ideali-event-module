import { useMutation, useQueryClient } from "@tanstack/react-query"
import { saveSeatsIoChartLayout } from "@/api/seatsio"

export function useSaveSeatsIoChartLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveSeatsIoChartLayout,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["seatsio", "chart-layouts"] })
    },
  })
}

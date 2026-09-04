import { useMutation } from "@tanstack/react-query"
import { fetchSeatsIoChartCategoryCapacity } from "@/api/seatsio"

/**
 * Reads how many seats and areas the published layout holds under each category.
 *
 * A mutation rather than a query: the organizer asks for the count when they need it, and asks again after editing
 * the chart, so a cached answer would hand back a number the layout no longer has.
 */
export function useSeatsIoChartCategoryCapacity() {
  return useMutation({
    mutationFn: (chartUniqueId: string) => fetchSeatsIoChartCategoryCapacity(chartUniqueId),
  })
}

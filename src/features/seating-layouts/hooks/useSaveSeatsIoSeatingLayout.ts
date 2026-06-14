import { useMutation, useQueryClient } from "@tanstack/react-query"
import { saveSeatsIoSeatingLayout } from "@/api/seatsio"

export function useSaveSeatsIoSeatingLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveSeatsIoSeatingLayout,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["seatsio", "seating-layouts"] })
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { refreshSeatsIoSeatingLayoutThumbnail } from "@/api/seatsio"

/**
 * Brings a layout's recorded preview image in line with Seats.io after the organizer publishes from inside the
 * designer, which changes the drawing without going through any call this app makes. It is a background courtesy,
 * so a failure is not surfaced: the designer save it follows has already succeeded, and the preview catches up on
 * the next publish.
 */
export function useRefreshSeatingLayoutThumbnail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refreshSeatsIoSeatingLayoutThumbnail,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["seatsio", "seating-layouts"] })
    },
  })
}

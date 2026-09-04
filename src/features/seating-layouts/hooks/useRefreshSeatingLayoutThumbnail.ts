import { useMutation, useQueryClient } from "@tanstack/react-query"
import { refreshSeatsIoSeatingLayoutThumbnail } from "@/api/seatsio"

/**
 * Brings a layout's recorded preview image in line with Seats.io. Publishing changes the drawing without going
 * through any call this app makes, whether it happens in the embedded designer or in Seats.io itself, so a layout
 * published anywhere else keeps whatever picture was last recorded — or none at all.
 *
 * It is a background courtesy, so a failure is not surfaced: whatever prompted it has already succeeded, and the
 * preview catches up on the next attempt.
 */
export function useRefreshSeatingLayoutThumbnail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refreshSeatsIoSeatingLayoutThumbnail,
    onSettled: () => {
      // Every Seats.io read carries the picture: the layout list, the layout detail and the charts a venue offers a
      // session. Refreshing one of them alone would leave the same layout pictured two different ways on two screens.
      void queryClient.invalidateQueries({ queryKey: ["seatsio"] })
    },
  })
}

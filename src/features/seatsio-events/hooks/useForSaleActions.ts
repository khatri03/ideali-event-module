import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  markSeatsIoEventEverythingForSale,
  markSeatsIoEventForSale,
  markSeatsIoEventNotForSale,
  type SeatsIoForSaleSelection,
} from "@/api/seatsio"
import { toaster } from "@/lib/toaster"
import { extractApiError } from "@/utils/errors"

/**
 * A for-sale change alters what the summary, statuses and for-sale tabs each report, so every one of those is refetched
 * once Seats.io has accepted it rather than left showing the state from before the change.
 */
function useInvalidateForSaleReports(eventUniqueId: string) {
  const queryClient = useQueryClient()

  return () => {
    for (const tab of ["for-sale", "summary", "statuses"]) {
      void queryClient.invalidateQueries({ queryKey: ["seatsio", "event-report", tab, eventUniqueId] })
    }
  }
}

export function useMarkNotForSale(eventUniqueId: string) {
  const invalidate = useInvalidateForSaleReports(eventUniqueId)

  return useMutation({
    mutationFn: (selection: SeatsIoForSaleSelection) => markSeatsIoEventNotForSale(eventUniqueId, selection),
    onSuccess: () => {
      invalidate()
      toaster.create({ type: "success", title: "Selection marked as not for sale" })
    },
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
  })
}

export function useMarkForSale(eventUniqueId: string) {
  const invalidate = useInvalidateForSaleReports(eventUniqueId)

  return useMutation({
    mutationFn: (selection: SeatsIoForSaleSelection) => markSeatsIoEventForSale(eventUniqueId, selection),
    onSuccess: () => {
      invalidate()
      toaster.create({ type: "success", title: "Selection marked as for sale" })
    },
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
  })
}

export function useMarkEverythingForSale(eventUniqueId: string) {
  const invalidate = useInvalidateForSaleReports(eventUniqueId)

  return useMutation({
    mutationFn: () => markSeatsIoEventEverythingForSale(eventUniqueId),
    onSuccess: () => {
      invalidate()
      toaster.create({ type: "success", title: "Everything is back on sale" })
    },
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
  })
}

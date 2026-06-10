import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchEventDiscountCouponsInfo,
  saveEventDiscountCoupons,
  type DiscountCouponBatchSaveRequest,
} from "@/api/discountCoupons"

export function useEventDiscountCoupons(eventId?: string) {
  return useQuery({
    queryKey: ["events", "discount-coupons", eventId],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventDiscountCouponsInfo(eventId)
    },
    enabled: !!eventId,
    retry: false,
  })
}

export function useSaveEventDiscountCoupons(eventId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: DiscountCouponBatchSaveRequest) => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return saveEventDiscountCoupons(eventId, request)
    },
    onSuccess: () => {
      if (!eventId) {
        return
      }

      queryClient.invalidateQueries({ queryKey: ["events"] })
      queryClient.invalidateQueries({ queryKey: ["events", "discount-coupons", eventId] })
    },
    onSettled: () => {
      if (!eventId) {
        return
      }

      queryClient.invalidateQueries({ queryKey: ["events", eventId] })
    },
  })
}

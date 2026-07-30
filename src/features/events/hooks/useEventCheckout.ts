import { useMutation, useQueryClient } from "@tanstack/react-query"
import { confirmEventCheckout, createEventPaymentIntent } from "@/api/eventCheckout"
import type { CreateEventPaymentIntentRequest } from "@/features/events/schemas/eventCart.schemas"

export function useCreateEventPaymentIntent(cartUniqueId?: string) {
  return useMutation({
    mutationFn: (request: CreateEventPaymentIntentRequest) => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return createEventPaymentIntent(cartUniqueId, request)
    },
  })
}

export function useConfirmEventCheckout(cartUniqueId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return confirmEventCheckout(cartUniqueId)
    },
    onSettled: () => {
      if (!cartUniqueId) {
        return
      }

      queryClient.invalidateQueries({ queryKey: ["event-cart", cartUniqueId] })
    },
  })
}

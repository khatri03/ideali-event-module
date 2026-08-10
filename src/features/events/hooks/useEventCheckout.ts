import { useMutation, useQueryClient } from "@tanstack/react-query"
import { confirmEventCheckout, createEventPaymentIntent, recordEventChequePayment } from "@/api/eventCheckout"
import type {
  CreateEventPaymentIntentRequest,
  RecordEventChequePaymentRequest,
} from "@/features/events/schemas/eventCart.schemas"

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

/**
 * Separate from the intent mutation rather than a branch inside it: the cheque call needs an organizer's
 * token, returns an order instead of a client secret, and finishes the checkout on its own. Sharing one
 * mutation would leave every caller unwrapping a union to find out which happened.
 */
export function useRecordEventChequePayment(cartUniqueId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: RecordEventChequePaymentRequest) => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return recordEventChequePayment(cartUniqueId, request)
    },
    onSettled: () => {
      if (!cartUniqueId) {
        return
      }

      queryClient.invalidateQueries({ queryKey: ["event-cart", cartUniqueId] })
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

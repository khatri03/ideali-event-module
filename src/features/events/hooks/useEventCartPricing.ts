import { useMutation, useQueryClient } from "@tanstack/react-query"
import { priceEventCart } from "@/api/eventCheckout"
import type { PriceEventCartRequest } from "@/features/events/schemas/eventCart.schemas"

export function usePriceEventCart(cartUniqueId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: PriceEventCartRequest) => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return priceEventCart(cartUniqueId, request)
    },
    onSettled: () => {
      if (!cartUniqueId) {
        return
      }

      queryClient.invalidateQueries({ queryKey: ["event-cart", cartUniqueId] })
    },
  })
}

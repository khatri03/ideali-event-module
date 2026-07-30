import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addEventCartLine, createEventCart, fetchEventCart, removeEventCartLine } from "@/api/eventCheckout"
import type { AddEventCartLineRequest, CreateEventCartRequest } from "@/features/events/schemas/eventCart.schemas"

export function useCreateEventCart() {
  return useMutation({
    mutationFn: (request: CreateEventCartRequest) => createEventCart(request),
  })
}

export function useEventCart(cartUniqueId?: string) {
  return useQuery({
    queryKey: ["event-cart", cartUniqueId],
    queryFn: () => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return fetchEventCart(cartUniqueId)
    },
    enabled: !!cartUniqueId,
  })
}

export function useAddEventCartLine(cartUniqueId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AddEventCartLineRequest) => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return addEventCartLine(cartUniqueId, request)
    },
    onSettled: () => {
      if (!cartUniqueId) {
        return
      }

      queryClient.invalidateQueries({ queryKey: ["event-cart", cartUniqueId] })
    },
  })
}

export function useRemoveEventCartLine(cartUniqueId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (lineUniqueId: string) => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return removeEventCartLine(cartUniqueId, lineUniqueId)
    },
    onSettled: () => {
      if (!cartUniqueId) {
        return
      }

      queryClient.invalidateQueries({ queryKey: ["event-cart", cartUniqueId] })
    },
  })
}

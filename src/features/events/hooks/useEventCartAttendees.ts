import { useMutation } from "@tanstack/react-query"
import { submitLineAnswers, submitLineAttendees } from "@/api/eventCheckout"
import type { SubmitLineAnswersRequest, SubmitLineAttendeesRequest } from "@/features/events/schemas/eventCart.schemas"

export function useSubmitLineAttendees(cartUniqueId?: string) {
  return useMutation({
    mutationFn: ({ lineUniqueId, request }: { lineUniqueId: string; request: SubmitLineAttendeesRequest }) => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return submitLineAttendees(cartUniqueId, lineUniqueId, request)
    },
  })
}

export function useSubmitLineAnswers(cartUniqueId?: string) {
  return useMutation({
    mutationFn: ({ lineUniqueId, request }: { lineUniqueId: string; request: SubmitLineAnswersRequest }) => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return submitLineAnswers(cartUniqueId, lineUniqueId, request)
    },
  })
}

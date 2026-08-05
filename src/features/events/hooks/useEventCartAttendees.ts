import { useMutation } from "@tanstack/react-query"
import { submitLineAttendees, submitOrderAnswers, uploadAnswerFile } from "@/api/eventCheckout"
import type {
  SubmitLineAttendeesRequest,
  SubmitOrderAnswersRequest,
} from "@/features/events/schemas/eventCart.schemas"

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

/** Custom forms and questions belong to the event, so answers post once for the whole order. */
export function useSubmitOrderAnswers(cartUniqueId?: string) {
  return useMutation({
    mutationFn: (request: SubmitOrderAnswersRequest) => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return submitOrderAnswers(cartUniqueId, request)
    },
  })
}

export function useUploadAnswerFile(cartUniqueId?: string) {
  return useMutation({
    mutationFn: ({ fieldUniqueId, file }: { fieldUniqueId: string; file: File }) => {
      if (!cartUniqueId) {
        throw new Error("Cart id is required.")
      }

      return uploadAnswerFile(cartUniqueId, fieldUniqueId, file)
    },
  })
}

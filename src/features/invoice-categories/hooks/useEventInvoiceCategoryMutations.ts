import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createEventInvoiceCategory,
  deleteEventInvoiceCategory,
  updateEventInvoiceCategory,
  type SaveEventInvoiceCategoryPayload,
} from "@/api/eventInvoiceCategories"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"
import { EVENT_INVOICE_CATEGORY_QUERY_KEY } from "./useEventInvoiceCategories"

export function useCreateEventInvoiceCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveEventInvoiceCategoryPayload) => createEventInvoiceCategory(payload),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Category created." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_INVOICE_CATEGORY_QUERY_KEY })
    },
  })
}

export function useUpdateEventInvoiceCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      uniqueId,
      payload,
    }: {
      uniqueId: string
      payload: SaveEventInvoiceCategoryPayload
    }) => updateEventInvoiceCategory(uniqueId, payload),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Category updated." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_INVOICE_CATEGORY_QUERY_KEY })
    },
  })
}

export function useDeleteEventInvoiceCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uniqueId: string) => deleteEventInvoiceCategory(uniqueId),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Category deleted." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_INVOICE_CATEGORY_QUERY_KEY })
    },
  })
}

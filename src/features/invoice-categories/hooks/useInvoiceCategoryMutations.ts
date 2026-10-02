import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createInvoiceCategory,
  deleteInvoiceCategory,
  updateInvoiceCategory,
  type SaveInvoiceCategoryPayload,
} from "@/api/invoiceCategories"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"
import { INVOICE_CATEGORY_QUERY_KEY } from "./useInvoiceCategories"

export function useCreateInvoiceCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveInvoiceCategoryPayload) => createInvoiceCategory(payload),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Category created." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_CATEGORY_QUERY_KEY })
    },
  })
}

export function useUpdateInvoiceCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      uniqueId,
      payload,
    }: {
      uniqueId: string
      payload: SaveInvoiceCategoryPayload
    }) => updateInvoiceCategory(uniqueId, payload),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Category updated." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_CATEGORY_QUERY_KEY })
    },
  })
}

export function useDeleteInvoiceCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uniqueId: string) => deleteInvoiceCategory(uniqueId),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Category deleted." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_CATEGORY_QUERY_KEY })
    },
  })
}

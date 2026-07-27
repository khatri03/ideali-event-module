import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createDocumentCategory,
  deleteDocumentCategory,
  downloadDocument,
  removeDocuments,
  updateDocumentCategory,
  uploadDocuments,
  type SaveDocumentCategoryPayload,
} from "@/api/documentCategories"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"
import { DOCUMENT_CATEGORY_QUERY_KEY } from "./useDocumentCategories"

export function useCreateDocumentCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveDocumentCategoryPayload) => createDocumentCategory(payload),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Document category created." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_CATEGORY_QUERY_KEY })
    },
  })
}

export function useUpdateDocumentCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uniqueId, payload }: { uniqueId: string; payload: SaveDocumentCategoryPayload }) =>
      updateDocumentCategory(uniqueId, payload),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Document category updated." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_CATEGORY_QUERY_KEY })
    },
  })
}

export function useDeleteDocumentCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uniqueId: string) => deleteDocumentCategory(uniqueId),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Document category deleted." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_CATEGORY_QUERY_KEY })
    },
  })
}

export function useUploadDocuments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uniqueId, files }: { uniqueId: string; files: File[] }) =>
      uploadDocuments(uniqueId, files),
    onSuccess: (_result, { files }) => {
      toaster.create({ type: "success", title: `${files.length} document(s) uploaded.` })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_CATEGORY_QUERY_KEY })
    },
  })
}

export function useRemoveDocuments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uniqueId, documentUniqueIds }: { uniqueId: string; documentUniqueIds: string[] }) =>
      removeDocuments(uniqueId, documentUniqueIds),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Document removed." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_CATEGORY_QUERY_KEY })
    },
  })
}

/** No cache to invalidate - a download changes nothing server-side, it only needs its failure surfaced. */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: ({ documentUniqueId, fileName }: { documentUniqueId: string; fileName: string }) =>
      downloadDocument(documentUniqueId, fileName),
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
  })
}

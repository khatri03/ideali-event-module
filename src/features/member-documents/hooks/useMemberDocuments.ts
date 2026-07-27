import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"
import {
  downloadMemberDocument,
  fetchMemberDocumentCategories,
  fetchMemberDocumentCategory,
  fetchMemberDocuments,
  viewMemberDocument,
  PopupBlockedError,
} from "@/api/documentCategories"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"

export const MEMBER_DOCUMENT_QUERY_KEY = ["member-documents"] as const

export function useMemberDocumentCategories(searchTerm: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: [...MEMBER_DOCUMENT_QUERY_KEY, "categories", searchTerm, page, pageSize],
    queryFn: () => fetchMemberDocumentCategories(searchTerm, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useMemberDocumentCategory(uniqueId: string) {
  return useQuery({
    queryKey: [...MEMBER_DOCUMENT_QUERY_KEY, "category", uniqueId],
    queryFn: () => fetchMemberDocumentCategory(uniqueId),
    enabled: Boolean(uniqueId),
  })
}

export function useMemberDocuments(uniqueId: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: [...MEMBER_DOCUMENT_QUERY_KEY, "documents", uniqueId, page, pageSize],
    queryFn: () => fetchMemberDocuments(uniqueId, page, pageSize),
    enabled: Boolean(uniqueId),
    placeholderData: keepPreviousData,
  })
}

/** No cache to invalidate - reading a document changes nothing, it only needs its failure surfaced. */
export function useDownloadMemberDocument() {
  return useMutation({
    mutationFn: ({ documentUniqueId, fileName }: { documentUniqueId: string; fileName: string }) =>
      downloadMemberDocument(documentUniqueId, fileName),
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
  })
}

export function useViewMemberDocument() {
  return useMutation({
    mutationFn: (documentUniqueId: string) => viewMemberDocument(documentUniqueId),
    onError: (error) => {
      // A blocked pop-up is our own error with actionable wording; extractApiError would flatten it to
      // the generic fallback and the member would never learn what to do about it.
      const title =
        error instanceof PopupBlockedError ? error.message : extractApiError(error)
      toaster.create({ type: "error", title })
    },
  })
}

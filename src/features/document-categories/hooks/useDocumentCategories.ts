import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchDocumentCategories,
  fetchDocumentCategory,
  fetchDocumentCategoryMembershipTypeOptions,
  type DocumentCategoryFilters,
} from "@/api/documentCategories"

export const DOCUMENT_CATEGORY_QUERY_KEY = ["organizer", "document-categories"] as const

export function useDocumentCategories(
  filters: DocumentCategoryFilters,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: [...DOCUMENT_CATEGORY_QUERY_KEY, "list", filters, page, pageSize],
    queryFn: () => fetchDocumentCategories(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useDocumentCategory(uniqueId: string) {
  return useQuery({
    queryKey: [...DOCUMENT_CATEGORY_QUERY_KEY, "detail", uniqueId],
    queryFn: () => fetchDocumentCategory(uniqueId),
    enabled: Boolean(uniqueId),
  })
}

export function useDocumentCategoryMembershipTypeOptions() {
  return useQuery({
    queryKey: [...DOCUMENT_CATEGORY_QUERY_KEY, "membership-type-options"],
    queryFn: fetchDocumentCategoryMembershipTypeOptions,
  })
}

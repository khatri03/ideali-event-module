import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchCustomList,
  fetchCustomListMemberOptions,
  fetchCustomListOptions,
  fetchCustomLists,
  type CustomListFilters,
} from "@/api/customLists"
import { fetchMembershipTypeOptions } from "@/api/memberships"

export const CUSTOM_LIST_QUERY_KEY = ["organizer", "custom-lists"] as const

export function useCustomLists(filters: CustomListFilters, pageNo: number, pageSize: number) {
  return useQuery({
    queryKey: [...CUSTOM_LIST_QUERY_KEY, { filters, pageNo, pageSize }],
    queryFn: () => fetchCustomLists(filters, pageNo, pageSize),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useCustomListOptions() {
  return useQuery({
    queryKey: [...CUSTOM_LIST_QUERY_KEY, "options"],
    queryFn: fetchCustomListOptions,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useCustomList(uniqueId: string | null) {
  return useQuery({
    queryKey: [...CUSTOM_LIST_QUERY_KEY, "detail", uniqueId],
    queryFn: () => fetchCustomList(uniqueId as string),
    enabled: Boolean(uniqueId),
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useCustomListMemberOptions(
  searchTerm: string,
  membershipTypeUniqueIds: string[],
  pageNo: number,
  pageSize: number,
  excludingCustomListUniqueId?: string,
) {
  return useQuery({
    queryKey: [
      ...CUSTOM_LIST_QUERY_KEY,
      "member-options",
      { searchTerm, membershipTypeUniqueIds, pageNo, pageSize, excludingCustomListUniqueId },
    ],
    queryFn: () =>
      fetchCustomListMemberOptions(
        searchTerm,
        membershipTypeUniqueIds,
        pageNo,
        pageSize,
        excludingCustomListUniqueId,
      ),
    enabled: membershipTypeUniqueIds.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useMembershipTypeOptions() {
  return useQuery({
    queryKey: ["organizer", "membership-type-options"],
    queryFn: fetchMembershipTypeOptions,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

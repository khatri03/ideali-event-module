import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchSessionList, type SessionListFilters } from "@/api/sessions"

export function useSessionList(pageNo: number, pageSize: number, filters?: SessionListFilters) {
  return useQuery({
    queryKey: ["sessions", { pageNo, pageSize, filters }],
    queryFn: () => fetchSessionList(filters, pageNo, pageSize),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

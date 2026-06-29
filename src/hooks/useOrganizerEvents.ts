import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchOrganizerEvents, type OrganizerEventListFilters } from "@/api/events"

export function useOrganizerEvents(pageNo: number, pageSize: number, filters?: OrganizerEventListFilters) {
  return useQuery({
    queryKey: ["events", { pageNo, pageSize, filters }],
    queryFn: () => fetchOrganizerEvents(pageNo, pageSize, filters),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

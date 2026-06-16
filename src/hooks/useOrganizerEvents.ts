import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchOrganizerEvents } from "@/api/events"

export function useOrganizerEvents(pageNo: number, pageSize: number) {
  return useQuery({
    queryKey: ["events", { pageNo, pageSize }],
    queryFn: () => fetchOrganizerEvents(pageNo, pageSize),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

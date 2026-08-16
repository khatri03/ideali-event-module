import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchSessionAttendees, type SessionAttendeeQuery } from "@/api/eventCheckIn"

export const ATTENDEE_PAGE_SIZE = 25

export function useSessionAttendees(query: SessionAttendeeQuery, isEnabled = true) {
  const pageSize = query.pageSize ?? ATTENDEE_PAGE_SIZE

  return useQuery({
    queryKey: [
      "session-attendees",
      query.eventUniqueId,
      query.sessionUniqueId,
      query.search ?? "",
      query.scope ?? "All",
      query.page ?? 1,
      pageSize,
    ],
    queryFn: () => fetchSessionAttendees({ ...query, pageSize }),
    enabled: isEnabled && Boolean(query.eventUniqueId && query.sessionUniqueId),
    placeholderData: keepPreviousData,
    // Doors are worked by more than one person at once, so the list is refetched on every return to
    // it rather than served from the shared stale window.
    refetchOnMount: "always",
  })
}

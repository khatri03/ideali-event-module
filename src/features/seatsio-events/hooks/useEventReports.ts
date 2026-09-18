import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchSeatsIoEventCategories,
  fetchSeatsIoEventChannels,
  fetchSeatsIoEventForSale,
  fetchSeatsIoEventRenderContext,
  fetchSeatsIoEventStatusChanges,
  fetchSeatsIoEventStatuses,
  fetchSeatsIoEventSummary,
  fetchSeatsIoEventTables,
} from "@/api/seatsio"

const REPORT_QUERY_OPTIONS = {
  retry: false,
  refetchOnWindowFocus: false,
} as const

export function useEventSummary(eventUniqueId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["seatsio", "event-report", "summary", eventUniqueId],
    queryFn: () => fetchSeatsIoEventSummary(eventUniqueId),
    enabled: enabled && Boolean(eventUniqueId),
    ...REPORT_QUERY_OPTIONS,
  })
}

export function useEventStatuses(eventUniqueId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["seatsio", "event-report", "statuses", eventUniqueId],
    queryFn: () => fetchSeatsIoEventStatuses(eventUniqueId),
    enabled: enabled && Boolean(eventUniqueId),
    ...REPORT_QUERY_OPTIONS,
  })
}

export function useEventForSale(eventUniqueId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["seatsio", "event-report", "for-sale", eventUniqueId],
    queryFn: () => fetchSeatsIoEventForSale(eventUniqueId),
    enabled: enabled && Boolean(eventUniqueId),
    ...REPORT_QUERY_OPTIONS,
  })
}

export function useEventTables(eventUniqueId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["seatsio", "event-report", "tables", eventUniqueId],
    queryFn: () => fetchSeatsIoEventTables(eventUniqueId),
    enabled: enabled && Boolean(eventUniqueId),
    ...REPORT_QUERY_OPTIONS,
  })
}

export function useEventChannels(eventUniqueId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["seatsio", "event-report", "channels", eventUniqueId],
    queryFn: () => fetchSeatsIoEventChannels(eventUniqueId),
    enabled: enabled && Boolean(eventUniqueId),
    ...REPORT_QUERY_OPTIONS,
  })
}

export function useEventCategories(eventUniqueId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["seatsio", "event-report", "categories", eventUniqueId],
    queryFn: () => fetchSeatsIoEventCategories(eventUniqueId),
    enabled: enabled && Boolean(eventUniqueId),
    ...REPORT_QUERY_OPTIONS,
  })
}

export function useEventRenderContext(eventUniqueId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["seatsio", "event-report", "render-context", eventUniqueId],
    queryFn: () => fetchSeatsIoEventRenderContext(eventUniqueId),
    enabled: enabled && Boolean(eventUniqueId),
    staleTime: Infinity,
    ...REPORT_QUERY_OPTIONS,
  })
}

export function useEventStatusChanges(eventUniqueId: string, startAfterId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["seatsio", "event-report", "status-changes", eventUniqueId, startAfterId],
    queryFn: () => fetchSeatsIoEventStatusChanges(eventUniqueId, startAfterId),
    enabled: enabled && Boolean(eventUniqueId),
    placeholderData: keepPreviousData,
    ...REPORT_QUERY_OPTIONS,
  })
}

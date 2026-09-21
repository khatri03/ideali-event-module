import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchSeatsIoEventCategories,
  fetchSeatsIoEventChannels,
  fetchSeatsIoEventForSale,
  fetchSeatsIoEventRenderContext,
  fetchSeatsIoEventStatusChanges,
  fetchSeatsIoEventSummary,
  fetchSeatsIoEventTables,
  markSeatsIoEventForSale,
  markSeatsIoEventNotForSale,
  type SeatsIoForSaleSelection,
} from "@/api/seatsio"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"

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

/**
 * The for-sale change refreshes the two reports it moves: the for-sale restriction itself, and the summary counts that
 * a change of sellable inventory shifts. Seats.io pushes the map update to the live chart on its own websocket, so the
 * chart is left to redraw itself.
 */
function useInvalidateForSaleReports(eventUniqueId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["seatsio", "event-report", "for-sale", eventUniqueId] })
    queryClient.invalidateQueries({ queryKey: ["seatsio", "event-report", "summary", eventUniqueId] })
  }
}

export function useMarkForSale(eventUniqueId: string) {
  const invalidate = useInvalidateForSaleReports(eventUniqueId)

  return useMutation({
    mutationFn: (selection: SeatsIoForSaleSelection) => markSeatsIoEventForSale(eventUniqueId, selection),
    onSuccess: () => toaster.create({ type: "success", title: "Put back on sale." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: invalidate,
  })
}

export function useMarkNotForSale(eventUniqueId: string) {
  const invalidate = useInvalidateForSaleReports(eventUniqueId)

  return useMutation({
    mutationFn: (selection: SeatsIoForSaleSelection) => markSeatsIoEventNotForSale(eventUniqueId, selection),
    onSuccess: () => toaster.create({ type: "success", title: "Marked as not for sale." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
    onSettled: invalidate,
  })
}


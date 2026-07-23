import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchAlert,
  fetchAlertRecipients,
  fetchAlerts,
  fetchCustomListOptions,
  fetchInbox,
  fetchMembershipTypeOptions,
  fetchUnreadCount,
  type AlertFilters,
} from "@/api/alerts"

export const ALERT_QUERY_KEY = ["organizer", "member-alerts"] as const
export const ALERT_INBOX_QUERY_KEY = ["alert-inbox"] as const

export function useAlerts(filters: AlertFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: [...ALERT_QUERY_KEY, "list", filters, page, pageSize],
    queryFn: () => fetchAlerts(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useAlert(uniqueId: string) {
  return useQuery({
    queryKey: [...ALERT_QUERY_KEY, "detail", uniqueId],
    queryFn: () => fetchAlert(uniqueId),
    enabled: Boolean(uniqueId),
  })
}

export function useAlertRecipients(
  uniqueId: string,
  searchTerm: string,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: [...ALERT_QUERY_KEY, "recipients", uniqueId, searchTerm, page, pageSize],
    queryFn: () => fetchAlertRecipients(uniqueId, searchTerm, page, pageSize),
    enabled: Boolean(uniqueId),
    placeholderData: keepPreviousData,
  })
}

export function useInbox(unreadOnly: boolean, page: number, pageSize: number) {
  return useQuery({
    queryKey: [...ALERT_INBOX_QUERY_KEY, "list", unreadOnly, page, pageSize],
    queryFn: () => fetchInbox(unreadOnly, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [...ALERT_INBOX_QUERY_KEY, "unread-count"],
    queryFn: fetchUnreadCount,
  })
}

export function useAlertMembershipTypeOptions() {
  return useQuery({
    queryKey: [...ALERT_QUERY_KEY, "membership-type-options"],
    queryFn: fetchMembershipTypeOptions,
  })
}

export function useAlertCustomListOptions() {
  return useQuery({
    queryKey: [...ALERT_QUERY_KEY, "custom-list-options"],
    queryFn: fetchCustomListOptions,
  })
}

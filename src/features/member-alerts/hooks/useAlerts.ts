import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchAlertCustomListPreview,
  fetchCustomListOptions,
  fetchAlertMemberPreview,
  fetchAlert,
  fetchAlertRecipients,
  fetchAlerts,
  fetchInbox,
  fetchMembershipTypeOptions,
  fetchUnreadCount,
  type AlertFilters,
  type AlertCustomListPreviewFilters,
  type AlertMemberPreviewFilters,
} from "@/api/alerts"
import { fetchMembershipStatusOptions } from "@/api/memberships"

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

export function useAlertMemberPreview(
  filters: AlertMemberPreviewFilters,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...ALERT_QUERY_KEY,
      "member-preview",
      filters.searchTerm,
      filters.membershipTypeUniqueIds,
      filters.membershipStatuses,
      page,
      pageSize,
    ],
    queryFn: () => fetchAlertMemberPreview(filters, page, pageSize),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useAlertCustomListPreview(
  filters: AlertCustomListPreviewFilters,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...ALERT_QUERY_KEY,
      "custom-list-preview",
      filters.searchTerm,
      filters.membershipTypeUniqueIds,
      filters.membershipStatuses,
      filters.customListUniqueIds,
      page,
      pageSize,
    ],
    queryFn: () => fetchAlertCustomListPreview(filters, page, pageSize),
    enabled,
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

export function useAlertMembershipStatusOptions() {
  return useQuery({
    queryKey: [...ALERT_QUERY_KEY, "membership-status-options"],
    queryFn: fetchMembershipStatusOptions,
  })
}

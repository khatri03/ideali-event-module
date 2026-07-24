import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createAlert,
  deleteAlert,
  markAlertRead,
  markAllSeen,
  resendAlert,
  type CreateAlertPayload,
} from "@/api/alerts"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"
import { ALERT_INBOX_QUERY_KEY, ALERT_QUERY_KEY } from "./useAlerts"

export function useCreateAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateAlertPayload) => createAlert(payload),
    onSuccess: (_id, payload) => {
      toaster.create({
        type: "success",
        title: payload.scheduledAtUtc ? "Alert scheduled." : "Alert sent.",
      })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEY })
    },
  })
}

export function useResendAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uniqueId: string) => resendAlert(uniqueId),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Alert resent." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEY })
    },
  })
}

export function useDeleteAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uniqueId: string) => deleteAlert(uniqueId),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Alert deleted." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEY })
    },
  })
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipientUniqueId: string) => markAlertRead(recipientUniqueId),
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_INBOX_QUERY_KEY })
    },
  })
}

/** Opening the bell marks everything seen — clears the badge but leaves items bold until individually opened. */
export function useMarkAllSeen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllSeen(),
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_INBOX_QUERY_KEY })
    },
  })
}

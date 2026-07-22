import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  addCustomListMembers,
  createCustomList,
  deleteCustomList,
  removeCustomListMembers,
  renameCustomList,
} from "@/api/customLists"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"
import { CUSTOM_LIST_QUERY_KEY } from "./useCustomLists"

export function useCreateCustomList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, memberUniqueIds }: { name: string; memberUniqueIds: string[] }) =>
      createCustomList(name, memberUniqueIds),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Custom list created." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_LIST_QUERY_KEY })
    },
  })
}

export function useRenameCustomList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uniqueId, name }: { uniqueId: string; name: string }) => renameCustomList(uniqueId, name),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Custom list renamed." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_LIST_QUERY_KEY })
    },
  })
}

export function useDeleteCustomList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uniqueId: string) => deleteCustomList(uniqueId),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Custom list deleted." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_LIST_QUERY_KEY })
    },
  })
}

export function useAddCustomListMembers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uniqueId, memberUniqueIds }: { uniqueId: string; memberUniqueIds: string[] }) =>
      addCustomListMembers(uniqueId, memberUniqueIds),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Members added." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_LIST_QUERY_KEY })
    },
  })
}

export function useRemoveCustomListMembers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uniqueId, memberUniqueIds }: { uniqueId: string; memberUniqueIds: string[] }) =>
      removeCustomListMembers(uniqueId, memberUniqueIds),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Members removed." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_LIST_QUERY_KEY })
    },
  })
}

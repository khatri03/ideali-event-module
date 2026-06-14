import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createSeatsIoChartCategory,
  deleteSeatsIoChartCategory,
  fetchSeatsIoChartCategories,
  updateSeatsIoChartCategory,
  type SeatsIoChartCategoryRequest,
} from "@/api/seatsio"

const seatsIoLayoutQueryKey = ["seatsio", "seating-layouts"] as const

function buildChartCategoriesQueryKey(chartUniqueId: string) {
  return ["seatsio", "chart-categories", { chartUniqueId }] as const
}

function invalidateSeatsIoChartQueries(queryClient: ReturnType<typeof useQueryClient>, chartUniqueId: string) {
  void queryClient.invalidateQueries({ queryKey: buildChartCategoriesQueryKey(chartUniqueId) })
  void queryClient.invalidateQueries({ queryKey: seatsIoLayoutQueryKey })
}

export function useSeatsIoChartCategories(chartUniqueId: string, enabled = true) {
  return useQuery({
    queryKey: buildChartCategoriesQueryKey(chartUniqueId),
    queryFn: () => fetchSeatsIoChartCategories(chartUniqueId),
    enabled: enabled && Boolean(chartUniqueId.trim()),
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useCreateSeatsIoChartCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { chartUniqueId: string; payload: SeatsIoChartCategoryRequest }) =>
      createSeatsIoChartCategory(params.chartUniqueId, params.payload),
    onSuccess: () => {},
    onError: () => {},
    onSettled: (_data, _error, variables) => {
      if (variables) {
        invalidateSeatsIoChartQueries(queryClient, variables.chartUniqueId)
      }
    },
  })
}

export function useUpdateSeatsIoChartCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { chartUniqueId: string; categoryUniqueId: string; payload: SeatsIoChartCategoryRequest }) =>
      updateSeatsIoChartCategory(params.chartUniqueId, params.categoryUniqueId, params.payload),
    onSuccess: () => {},
    onError: () => {},
    onSettled: (_data, _error, variables) => {
      if (variables) {
        invalidateSeatsIoChartQueries(queryClient, variables.chartUniqueId)
      }
    },
  })
}

export function useDeleteSeatsIoChartCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { chartUniqueId: string; categoryUniqueId: string }) =>
      deleteSeatsIoChartCategory(params.chartUniqueId, params.categoryUniqueId),
    onSuccess: () => {},
    onError: () => {},
    onSettled: (_data, _error, variables) => {
      if (variables) {
        invalidateSeatsIoChartQueries(queryClient, variables.chartUniqueId)
      }
    },
  })
}

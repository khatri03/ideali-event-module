import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createOrganizerChargeRule,
  fetchOrganizerChargeRules,
  updateOrganizerChargeRule,
  type OrganizerChargeRuleInput,
} from "@/api/chargeRules"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"

const CHARGE_RULE_QUERY_KEY = ["organizer", "charge-rules"] as const

export function useChargeRules(pageNo: number, pageSize: number) {
  return useQuery({
    queryKey: [...CHARGE_RULE_QUERY_KEY, { pageNo, pageSize }],
    queryFn: () => fetchOrganizerChargeRules(pageNo, pageSize),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useCreateChargeRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createOrganizerChargeRule,
    onSuccess: () => {
      toaster.create({
        type: "success",
        title: "Charge rule saved.",
      })
    },
    onError: (error) => {
      toaster.create({
        type: "error",
        title: extractApiError(error),
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CHARGE_RULE_QUERY_KEY })
    },
  })
}

export function useUpdateChargeRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ uniqueId, input }: { uniqueId: string; input: OrganizerChargeRuleInput }) =>
      updateOrganizerChargeRule(uniqueId, input),
    onSuccess: () => {
      toaster.create({
        type: "success",
        title: "Charge rule updated.",
      })
    },
    onError: (error) => {
      toaster.create({
        type: "error",
        title: extractApiError(error),
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CHARGE_RULE_QUERY_KEY })
    },
  })
}

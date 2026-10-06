import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  setCustomInvoicingModule,
  type CustomInvoicingModuleState,
  type CustomInvoicingModuleToggleResult,
} from "@/api/adminCustomInvoicingModules"
import type { CustomInvoiceModule } from "@/api/customInvoices"
import { toaster } from "@/lib/toaster"
import { extractApiError } from "@/utils/errors"
import { CUSTOM_INVOICING_MODULES_QUERY_KEY } from "./useCustomInvoicingModules"

interface ToggleVariables {
  moduleType: CustomInvoiceModule
  isEnabled: boolean
}

interface ToggleContext {
  previous: CustomInvoicingModuleState[] | undefined
}

function withModuleState(
  states: CustomInvoicingModuleState[] | undefined,
  { moduleType, isEnabled }: ToggleVariables,
): CustomInvoicingModuleState[] | undefined {
  return states?.map((state) => (state.moduleType === moduleType ? { ...state, isEnabled } : state))
}

export function useSetCustomInvoicingModule() {
  const queryClient = useQueryClient()

  return useMutation<CustomInvoicingModuleToggleResult, unknown, ToggleVariables, ToggleContext>({
    mutationFn: ({ moduleType, isEnabled }) => setCustomInvoicingModule(moduleType, isEnabled),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: CUSTOM_INVOICING_MODULES_QUERY_KEY })
      const previous = queryClient.getQueryData<CustomInvoicingModuleState[]>(CUSTOM_INVOICING_MODULES_QUERY_KEY)
      queryClient.setQueryData(CUSTOM_INVOICING_MODULES_QUERY_KEY, withModuleState(previous, variables))
      return { previous }
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(CUSTOM_INVOICING_MODULES_QUERY_KEY, context?.previous)
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSuccess: ({ message }) => {
      toaster.create({ type: "success", title: message })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_INVOICING_MODULES_QUERY_KEY })
    },
  })
}

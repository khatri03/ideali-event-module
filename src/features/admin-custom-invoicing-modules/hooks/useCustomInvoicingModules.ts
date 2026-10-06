import { useQuery } from "@tanstack/react-query"
import { fetchCustomInvoicingModules } from "@/api/adminCustomInvoicingModules"

export const CUSTOM_INVOICING_MODULES_QUERY_KEY = ["admin", "custom-invoicing-modules"] as const

export function useCustomInvoicingModules() {
  return useQuery({
    queryKey: CUSTOM_INVOICING_MODULES_QUERY_KEY,
    queryFn: fetchCustomInvoicingModules,
  })
}

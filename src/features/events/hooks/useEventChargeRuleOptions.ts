import { useQuery } from "@tanstack/react-query"
import { fetchOrganizerChargeRules } from "@/api/chargeRules"

export interface EventChargeRuleOption {
  value: string
  label: string
  description: string
  isActive: boolean
}

const CHARGE_RULE_OPTIONS_PAGE_SIZE = 1000

export function useEventChargeRuleOptions() {
  return useQuery({
    queryKey: ["organizer", "charge-rules", { pageNo: 1, pageSize: CHARGE_RULE_OPTIONS_PAGE_SIZE, purpose: "event-advanced-settings" }],
    queryFn: async () => {
      const page = await fetchOrganizerChargeRules(1, CHARGE_RULE_OPTIONS_PAGE_SIZE)

      return page.items.map((item) => ({
        value: item.uniqueId,
        label: item.label,
        description: `${item.name} - ${item.chargeKind} - ${item.calculationType === "Percent" ? `${item.value}%` : item.value}`,
        isActive: item.isActive,
      }))
    },
    retry: false,
    refetchOnWindowFocus: false,
  })
}

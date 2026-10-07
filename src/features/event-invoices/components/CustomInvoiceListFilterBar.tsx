import { useMemo } from "react"
import { Box, Button, Field, Flex, SimpleGrid } from "@chakra-ui/react"
import { RotateCcw } from "lucide-react"
import { CUSTOM_INVOICE_MODULES } from "@/api/customInvoices"
import { StyledSelect, type SelectOption } from "@/components/common"
import { parseCustomInvoiceModule } from "@/utils/customInvoiceEntity"
import { useEnabledCustomInvoiceModules } from "../hooks/useCustomInvoiceAuthoringOptions"
import { useCustomInvoiceListFilterOptions } from "../hooks/useCustomInvoiceList"
import type { CustomInvoiceListSearchParams } from "../hooks/useCustomInvoiceListSearchParams"
import { CustomInvoiceSearchField } from "./CustomInvoiceSearchField"
import { CustomInvoiceStatusChips } from "./CustomInvoiceStatusChips"

interface CustomInvoiceListFilterBarProps {
  filters: CustomInvoiceListSearchParams
}

const FIELD_LABEL = { fontSize: "sm", fontWeight: "700", color: "text.primary" } as const

/**
 * Offers the enabled modules plus any module that still has invoices, so invoices of a since-disabled
 * module stay reachable (D-15).
 */
function useModuleOptions(): SelectOption[] {
  const enabledModules = useEnabledCustomInvoiceModules()
  const filterOptions = useCustomInvoiceListFilterOptions()
  return useMemo(() => {
    const offered = new Set([...(enabledModules.data ?? []), ...(filterOptions.data?.moduleTypes ?? [])])
    const modules = CUSTOM_INVOICE_MODULES.filter((moduleType) => offered.has(moduleType))
    return [{ value: "", label: "All modules" }, ...modules.map((moduleType) => ({ value: moduleType, label: moduleType }))]
  }, [enabledModules.data, filterOptions.data])
}

function useCategoryOptions(): SelectOption[] {
  const filterOptions = useCustomInvoiceListFilterOptions()
  return useMemo(
    () => [
      { value: "", label: "All categories" },
      ...(filterOptions.data?.categories ?? []).map((category) => ({
        value: category.uniqueId,
        label: category.isActive ? category.name : `${category.name} (inactive)`,
      })),
    ],
    [filterOptions.data],
  )
}

function ModuleField({ filters }: CustomInvoiceListFilterBarProps) {
  const moduleOptions = useModuleOptions()

  if (filters.lockedModule) {
    return (
      <Field.Root disabled>
        <Field.Label {...FIELD_LABEL}>Module</Field.Label>
        <Box w="full" cursor="not-allowed">
          <StyledSelect
            options={[{ value: filters.lockedModule, label: filters.lockedModule }]}
            value={filters.lockedModule}
            onChange={() => undefined}
            ariaLabel="Module"
            disabled
          />
        </Box>
        <Field.HelperText>Showing {filters.lockedModule} invoices only.</Field.HelperText>
      </Field.Root>
    )
  }

  return (
    <Field.Root>
      <Field.Label {...FIELD_LABEL}>Module</Field.Label>
      <StyledSelect
        options={moduleOptions}
        value={filters.freeModule ?? ""}
        onChange={(value) => filters.setFreeModule(parseCustomInvoiceModule(value))}
        placeholder="All modules"
        ariaLabel="Module"
      />
    </Field.Root>
  )
}

export function CustomInvoiceListFilterBar({ filters }: CustomInvoiceListFilterBarProps) {
  const categoryOptions = useCategoryOptions()

  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" p={{ base: 4, md: 5 }}>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
        <ModuleField filters={filters} />

        <Field.Root>
          <Field.Label {...FIELD_LABEL}>Category</Field.Label>
          <StyledSelect
            options={categoryOptions}
            value={filters.query.categoryUniqueId ?? ""}
            onChange={(value) => filters.setCategory(value || undefined)}
            placeholder="All categories"
            ariaLabel="Category"
          />
        </Field.Root>

        <CustomInvoiceSearchField value={filters.query.searchTerm} onChange={filters.setSearch} />
      </SimpleGrid>

      <Flex mt={4} direction={{ base: "column", lg: "row" }} gap={4} align={{ base: "stretch", lg: "center" }} justify="space-between">
        <CustomInvoiceStatusChips selected={filters.query.statuses} onToggle={filters.toggleStatus} />

        <Button
          variant="outline"
          minH="11"
          px={6}
          borderRadius="14px"
          flexShrink={0}
          cursor={filters.hasActiveFilters ? "pointer" : "not-allowed"}
          disabled={!filters.hasActiveFilters}
          onClick={filters.clearFilters}
        >
          <RotateCcw size={15} />
          Clear filters
        </Button>
      </Flex>
    </Box>
  )
}

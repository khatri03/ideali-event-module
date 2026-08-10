import { useMemo } from "react"
import { Box, Button, Field, Flex, Input, SimpleGrid } from "@chakra-ui/react"
import { Filter, RotateCcw, Search } from "lucide-react"
import { EVENT_INVOICE_PAYMENT_METHOD_OPTIONS, EVENT_INVOICE_STATUS_OPTIONS } from "@/api/eventInvoices"
import { useEventInvoiceFilterOptions } from "../hooks/useEventInvoices"
import { FilterMultiSelect, type FilterSelectOption } from "./FilterMultiSelect"

export interface EventInvoiceDraftFilters {
  searchTerm: string
  eventUniqueIds: string[]
  sessionUniqueIds: string[]
  statuses: string[]
  paymentMethods: string[]
  invoiceDateFrom: string
  invoiceDateTo: string
}

interface EventInvoiceFilterBarProps {
  draft: EventInvoiceDraftFilters
  hasAppliedFilter: boolean
  isApplying: boolean
  onDraftChange: (updater: (current: EventInvoiceDraftFilters) => EventInvoiceDraftFilters) => void
  onApply: () => void
  onClear: () => void
}

export function EventInvoiceFilterBar({
  draft,
  hasAppliedFilter,
  isApplying,
  onDraftChange,
  onApply,
  onClear,
}: EventInvoiceFilterBarProps) {
  const filterOptionsQuery = useEventInvoiceFilterOptions()

  const eventOptions = useMemo<FilterSelectOption[]>(
    () => (filterOptionsQuery.data?.events ?? []).map((option) => ({ value: option.uniqueId, label: option.name })),
    [filterOptionsQuery.data],
  )

  const sessionOptions = useMemo<FilterSelectOption[]>(() => {
    const sessions = filterOptionsQuery.data?.sessions ?? []
    const scoped = draft.eventUniqueIds.length
      ? sessions.filter((session) => draft.eventUniqueIds.includes(session.eventUniqueId))
      : sessions
    return scoped.map((session) => ({ value: session.uniqueId, label: session.name }))
  }, [filterOptionsQuery.data, draft.eventUniqueIds])

  const canClear =
    hasAppliedFilter ||
    draft.searchTerm.trim().length > 0 ||
    draft.eventUniqueIds.length > 0 ||
    draft.sessionUniqueIds.length > 0 ||
    draft.statuses.length > 0 ||
    draft.paymentMethods.length > 0 ||
    Boolean(draft.invoiceDateFrom) ||
    Boolean(draft.invoiceDateTo)

  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" p={{ base: 4, md: 5 }}>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Event
          </Field.Label>
          <Box w="full">
            <FilterMultiSelect
              options={eventOptions}
              selectedValues={draft.eventUniqueIds}
              onChange={(eventUniqueIds) => onDraftChange((current) => ({ ...current, eventUniqueIds }))}
              placeholder={filterOptionsQuery.isLoading ? "Loading events..." : "All events"}
              isLoading={filterOptionsQuery.isLoading}
            />
          </Box>
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Session
          </Field.Label>
          <Box w="full">
            <FilterMultiSelect
              options={sessionOptions}
              selectedValues={draft.sessionUniqueIds}
              onChange={(sessionUniqueIds) => onDraftChange((current) => ({ ...current, sessionUniqueIds }))}
              placeholder={filterOptionsQuery.isLoading ? "Loading sessions..." : "All sessions"}
              isLoading={filterOptionsQuery.isLoading}
            />
          </Box>
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Status
          </Field.Label>
          <Box w="full">
            <FilterMultiSelect
              options={EVENT_INVOICE_STATUS_OPTIONS}
              selectedValues={draft.statuses}
              onChange={(statuses) => onDraftChange((current) => ({ ...current, statuses }))}
              placeholder="All statuses"
            />
          </Box>
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Payment method
          </Field.Label>
          <Box w="full">
            <FilterMultiSelect
              options={EVENT_INVOICE_PAYMENT_METHOD_OPTIONS}
              selectedValues={draft.paymentMethods}
              onChange={(paymentMethods) => onDraftChange((current) => ({ ...current, paymentMethods }))}
              placeholder="All methods"
            />
          </Box>
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            From
          </Field.Label>
          <Input
            type="date"
            value={draft.invoiceDateFrom}
            onChange={(event) => onDraftChange((current) => ({ ...current, invoiceDateFrom: event.target.value }))}
            minH="11"
            borderRadius="14px"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            To
          </Field.Label>
          <Input
            type="date"
            value={draft.invoiceDateTo}
            onChange={(event) => onDraftChange((current) => ({ ...current, invoiceDateTo: event.target.value }))}
            minH="11"
            borderRadius="14px"
          />
        </Field.Root>
      </SimpleGrid>

      <Flex mt={4} direction={{ base: "column", lg: "row" }} gap={4} align={{ base: "stretch", lg: "flex-end" }}>
        <Field.Root flex={1} minW={0}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Search
          </Field.Label>
          <Flex position="relative" align="center" w="full">
            <Box position="absolute" left={4} color="gray.400" pointerEvents="none" display="flex">
              <Search size={16} />
            </Box>
            <Input
              value={draft.searchTerm}
              onChange={(event) => onDraftChange((current) => ({ ...current, searchTerm: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  onApply()
                }
              }}
              placeholder="Invoice no, buyer name/email, event name"
              minH="11"
              borderRadius="14px"
              pl={10}
              pr={4}
            />
          </Flex>
        </Field.Root>

        <Flex gap={2} flexShrink={0} direction={{ base: "column", sm: "row" }}>
          <Button
            minH="11"
            px={6}
            borderRadius="14px"
            fontWeight="700"
            color="white"
            cursor="pointer"
            loading={isApplying}
            loadingText="Applying..."
            onClick={onApply}
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
          >
            <Filter size={15} />
            Apply
          </Button>

          <Button
            variant="outline"
            minH="11"
            px={6}
            borderRadius="14px"
            cursor={canClear ? "pointer" : "not-allowed"}
            disabled={!canClear}
            onClick={onClear}
          >
            <RotateCcw size={15} />
            Clear
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}

import { useMemo } from "react"
import { Box, Button, Field, Flex, Input, SimpleGrid } from "@chakra-ui/react"
import ReactSelect from "react-select"
import { Filter, RotateCcw, Search } from "lucide-react"
import { EVENT_INVOICE_PAYMENT_METHOD_OPTIONS, EVENT_INVOICE_STATUS_OPTIONS } from "@/api/eventInvoices"
import { useEventInvoiceFilterOptions } from "../hooks/useEventInvoices"

interface SelectOption {
  value: string
  label: string
}

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

function toOptions(select: readonly SelectOption[] | undefined, values: string[]) {
  return (select ?? []).filter((option) => values.includes(option.value))
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

  const eventOptions = useMemo<SelectOption[]>(
    () => (filterOptionsQuery.data?.events ?? []).map((option) => ({ value: option.uniqueId, label: option.name })),
    [filterOptionsQuery.data],
  )

  const sessionOptions = useMemo<SelectOption[]>(() => {
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
            <ReactSelect
              isMulti
              options={eventOptions}
              value={toOptions(eventOptions, draft.eventUniqueIds)}
              onChange={(values) =>
                onDraftChange((current) => ({ ...current, eventUniqueIds: values.map((option) => option.value) }))
              }
              placeholder={filterOptionsQuery.isLoading ? "Loading events..." : "All events"}
              isLoading={filterOptionsQuery.isLoading}
              closeMenuOnSelect={false}
              isClearable
            />
          </Box>
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Session
          </Field.Label>
          <Box w="full">
            <ReactSelect
              isMulti
              options={sessionOptions}
              value={toOptions(sessionOptions, draft.sessionUniqueIds)}
              onChange={(values) =>
                onDraftChange((current) => ({ ...current, sessionUniqueIds: values.map((option) => option.value) }))
              }
              placeholder={filterOptionsQuery.isLoading ? "Loading sessions..." : "All sessions"}
              isLoading={filterOptionsQuery.isLoading}
              closeMenuOnSelect={false}
              isClearable
            />
          </Box>
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Status
          </Field.Label>
          <Box w="full">
            <ReactSelect
              isMulti
              options={EVENT_INVOICE_STATUS_OPTIONS as unknown as SelectOption[]}
              value={toOptions(EVENT_INVOICE_STATUS_OPTIONS as unknown as SelectOption[], draft.statuses)}
              onChange={(values) =>
                onDraftChange((current) => ({ ...current, statuses: values.map((option) => option.value) }))
              }
              placeholder="All statuses"
              closeMenuOnSelect={false}
              isClearable
            />
          </Box>
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Payment method
          </Field.Label>
          <Box w="full">
            <ReactSelect
              isMulti
              options={EVENT_INVOICE_PAYMENT_METHOD_OPTIONS as unknown as SelectOption[]}
              value={toOptions(EVENT_INVOICE_PAYMENT_METHOD_OPTIONS as unknown as SelectOption[], draft.paymentMethods)}
              onChange={(values) =>
                onDraftChange((current) => ({ ...current, paymentMethods: values.map((option) => option.value) }))
              }
              placeholder="All methods"
              closeMenuOnSelect={false}
              isClearable
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

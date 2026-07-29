import { useMemo, type ReactNode } from "react"
import { Box, Badge, Button, Flex, Input, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import ReactSelect, { components, type MultiValue, type OptionProps, type StylesConfig } from "react-select"
import { ChevronDown, ChevronUp, Filter, Check } from "lucide-react"
import type { SessionFilterOptionsResponse, SessionListFilters, SessionListOption } from "@/api/sessions"

interface SessionFiltersCardProps {
  isExpanded: boolean
  filterCount: number
  hasAppliedFilters: boolean
  draftFilters: SessionListFilters
  filterOptions: SessionFilterOptionsResponse
  isLoading: boolean
  isError: boolean
  error: string
  onToggleExpanded: () => void
  onApply: () => void
  onClear: () => void
  onDraftFiltersChange: (updater: (current: SessionListFilters) => SessionListFilters) => void
}

interface SelectOption {
  label: string
  value: string
}

// Shared by both the multi and single selects below, so IsMulti stays open rather than pinned to true.
const filterMultiSelectStyles: StylesConfig<SelectOption, boolean> = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    width: "100%",
    borderRadius: 16,
    borderColor: state.isFocused ? "#7551FF" : "#E2E8F0",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(117, 81, 255, 0.15)" : "none",
    backgroundColor: "#fff",
  }),
  container: (base) => ({
    ...base,
    width: "100%",
  }),
  valueContainer: (base) => ({
    ...base,
    flex: 1,
    minWidth: 0,
  }),
  input: (base) => ({
    ...base,
    width: "100%",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 40,
    borderRadius: 14,
  }),
  multiValue: (base) => ({
    ...base,
    borderRadius: 999,
    backgroundColor: "rgba(117, 81, 255, 0.12)",
    border: "1px solid rgba(117, 81, 255, 0.18)",
    margin: "2px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    fontSize: 12,
    fontWeight: 700,
    color: "#422AFB",
    paddingLeft: "8px",
    paddingRight: "4px",
  }),
  multiValueRemove: (base) => ({
    ...base,
    borderRadius: 999,
    color: "#7551FF",
    paddingLeft: "4px",
    paddingRight: "8px",
    ":hover": {
      backgroundColor: "rgba(117, 81, 255, 0.18)",
      color: "#422AFB",
    },
  }),
}

function CheckboxOption(props: OptionProps<SelectOption, true>) {
  return (
    <components.Option {...props}>
      <Flex align="center" gap={3}>
        <Box
          boxSize="18px"
          borderRadius="6px"
          border="1px solid"
          borderColor={props.isSelected ? "brand.500" : "gray.300"}
          bg={props.isSelected ? "brand.500" : "white"}
          color="white"
          _dark={{
            borderColor: props.isSelected ? "brand.400" : "whiteAlpha.300",
            bg: props.isSelected ? "brand.500" : "navy.700",
          }}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          {props.isSelected ? <Check size={11} /> : null}
        </Box>
        <Box minW={0}>
          <Text fontSize="sm" fontWeight="600" color="gray.800" lineClamp={1} _dark={{ color: "gray.100" }}>
            {props.label}
          </Text>
        </Box>
      </Flex>
    </components.Option>
  )
}

function SingleSelectOption(props: OptionProps<SelectOption, false>) {
  return (
    <components.Option {...props}>
      <Box minW={0}>
        <Text fontSize="sm" fontWeight="600" color="gray.800" lineClamp={1} _dark={{ color: "gray.100" }}>
          {props.label}
        </Text>
      </Box>
    </components.Option>
  )
}

function toSelectOptions(options: SessionListOption[]): SelectOption[] {
  return options.map((option) => ({
    label: option.label,
    value: option.value,
  }))
}

function getSelectedOptions(options: SelectOption[], values: string[] | undefined) {
  return options.filter((option) => values?.includes(option.value))
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Box minW={0}>
      <Text fontSize="sm" fontWeight="700" color="text.primary" mb={2}>
        {label}
      </Text>
      {children}
    </Box>
  )
}

export function SessionFiltersCard({
  isExpanded,
  filterCount,
  hasAppliedFilters,
  draftFilters,
  filterOptions,
  isLoading,
  isError,
  error,
  onToggleExpanded,
  onApply,
  onClear,
  onDraftFiltersChange,
}: SessionFiltersCardProps) {
  const genreOptions = useMemo(() => toSelectOptions(filterOptions.genres), [filterOptions.genres])
  const eventOptions = useMemo(() => toSelectOptions(filterOptions.events), [filterOptions.events])
  const venueOptions = useMemo(() => toSelectOptions(filterOptions.venues), [filterOptions.venues])
  const bookingStatusOptions = useMemo(() => toSelectOptions(filterOptions.bookingStatuses), [filterOptions.bookingStatuses])
  const seatEnabledOptions = useMemo(() => toSelectOptions(filterOptions.seatEnabledOptions), [filterOptions.seatEnabledOptions])

  const selectedGenreOptions = useMemo(
    () => getSelectedOptions(genreOptions, draftFilters.genreUniqueIds),
    [draftFilters.genreUniqueIds, genreOptions],
  )
  const selectedEventOptions = useMemo(
    () => getSelectedOptions(eventOptions, draftFilters.eventUniqueIds),
    [draftFilters.eventUniqueIds, eventOptions],
  )
  const selectedVenueOptions = useMemo(
    () => getSelectedOptions(venueOptions, draftFilters.venueUniqueIds),
    [draftFilters.venueUniqueIds, venueOptions],
  )
  const selectedBookingStatusOptions = useMemo(
    () => getSelectedOptions(bookingStatusOptions, draftFilters.bookingStatuses),
    [bookingStatusOptions, draftFilters.bookingStatuses],
  )
  const selectedSeatEnabledOption = useMemo(
    () => getSelectedOptions(seatEnabledOptions, draftFilters.seatEnabled)[0] ?? null,
    [seatEnabledOptions, draftFilters.seatEnabled],
  )

  return (
    <Box mb={5} borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="app.bg" overflow="hidden">
      <Box
        as="button"
        w="full"
        px={4}
        py={4}
        cursor="pointer"
        onClick={onToggleExpanded}
        _hover={{ bg: "gray.50", _dark: { bg: "navy.800" } }}
      >
        <Flex align="center" justify="space-between" gap={3}>
          <Flex align="center" gap={2}>
            <Box color="text.secondary">
              <Filter size={15} />
            </Box>
            <Text fontSize="sm" fontWeight="700" color="text.primary">
              Filters
            </Text>
            {filterCount > 0 ? (
              <Badge colorPalette="brand" variant="solid" borderRadius="full" fontSize="10px" px={1.5}>
                {filterCount}
              </Badge>
            ) : null}
          </Flex>

          <Flex align="center" gap={2} borderRadius="999px" px={3} minH="9" color="text.primary" fontSize="sm" fontWeight="700" pointerEvents="none">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Flex>
        </Flex>
      </Box>

      {isExpanded ? (
        <Box px={4} pb={4}>
          <Box borderRadius="18px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={{ base: 4, md: 5 }} shadow="sm">
            <Stack gap={5}>
              <SimpleGrid columns={{ base: 1, lg: 3 }} gap={4}>
                <FilterField label="Name">
                  <Input
                    value={draftFilters.name ?? ""}
                    onChange={(event) =>
                      onDraftFiltersChange((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Search by session name"
                    borderRadius="16px"
                    borderColor="secondaryGray.100"
                    bg="app.bg"
                    fontSize="sm"
                    h="44px"
                    px={4}
                    _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)" }}
                    _dark={{ borderColor: "navy.600" }}
                  />
                </FilterField>

                <FilterField label="Event">
                  <ReactSelect
                    isMulti
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    options={eventOptions}
                    value={selectedEventOptions}
                    onChange={(values: MultiValue<SelectOption>) =>
                      onDraftFiltersChange((current) => ({
                        ...current,
                        eventUniqueIds: values.map((value) => value.value),
                      }))
                    }
                    placeholder={isLoading ? "Loading events..." : "Select events"}
                    styles={filterMultiSelectStyles}
                    components={{ Option: CheckboxOption }}
                    isDisabled={isLoading || isError}
                  />
                </FilterField>

                <FilterField label="Venue">
                  <ReactSelect
                    isMulti
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    options={venueOptions}
                    value={selectedVenueOptions}
                    onChange={(values: MultiValue<SelectOption>) =>
                      onDraftFiltersChange((current) => ({
                        ...current,
                        venueUniqueIds: values.map((value) => value.value),
                      }))
                    }
                    placeholder={isLoading ? "Loading venues..." : "Select venues"}
                    styles={filterMultiSelectStyles}
                    components={{ Option: CheckboxOption }}
                    isDisabled={isLoading || isError}
                  />
                </FilterField>

                <FilterField label="Session from">
                  <Input
                    type="date"
                    value={draftFilters.startFrom ?? ""}
                    onChange={(event) =>
                      onDraftFiltersChange((current) => ({
                        ...current,
                        startFrom: event.target.value,
                      }))
                    }
                    borderRadius="16px"
                    borderColor="secondaryGray.100"
                    bg="app.bg"
                    fontSize="sm"
                    h="44px"
                    px={4}
                    _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)" }}
                    _dark={{ borderColor: "navy.600" }}
                  />
                </FilterField>

                <FilterField label="Session to">
                  <Input
                    type="date"
                    value={draftFilters.startTo ?? ""}
                    onChange={(event) =>
                      onDraftFiltersChange((current) => ({
                        ...current,
                        startTo: event.target.value,
                      }))
                    }
                    borderRadius="16px"
                    borderColor="secondaryGray.100"
                    bg="app.bg"
                    fontSize="sm"
                    h="44px"
                    px={4}
                    _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)" }}
                    _dark={{ borderColor: "navy.600" }}
                  />
                </FilterField>

                <FilterField label="Genres">
                  <ReactSelect
                    isMulti
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    options={genreOptions}
                    value={selectedGenreOptions}
                    onChange={(values: MultiValue<SelectOption>) =>
                      onDraftFiltersChange((current) => ({
                        ...current,
                        genreUniqueIds: values.map((value) => value.value),
                      }))
                    }
                    placeholder={isLoading ? "Loading genres..." : "Select genres"}
                    styles={filterMultiSelectStyles}
                    components={{ Option: CheckboxOption }}
                    isDisabled={isLoading || isError}
                  />
                </FilterField>

                <FilterField label="Booking Status">
                  <ReactSelect
                    isMulti
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    options={bookingStatusOptions}
                    value={selectedBookingStatusOptions}
                    onChange={(values: MultiValue<SelectOption>) =>
                      onDraftFiltersChange((current) => ({
                        ...current,
                        bookingStatuses: values.map((value) => value.value),
                      }))
                    }
                    placeholder={isLoading ? "Loading booking statuses..." : "Select booking statuses"}
                    styles={filterMultiSelectStyles}
                    components={{ Option: CheckboxOption }}
                    isDisabled={isLoading || isError}
                  />
                </FilterField>

                <FilterField label="Seat Enabled">
                  <ReactSelect
                    isClearable
                    options={seatEnabledOptions}
                    value={selectedSeatEnabledOption}
                    onChange={(value) =>
                      onDraftFiltersChange((current) => ({
                        ...current,
                        seatEnabled: value ? [value.value] : [],
                      }))
                    }
                    placeholder={isLoading ? "Loading seat options..." : "Select seat options"}
                    styles={filterMultiSelectStyles}
                    components={{ Option: SingleSelectOption }}
                    isDisabled={isLoading || isError}
                  />
                </FilterField>
              </SimpleGrid>

              {isError ? (
                <Box p={3.5} borderRadius="14px" border="1px solid" borderColor="red.200" bg="red.50">
                  <Text fontSize="sm" fontWeight="600" color="red.700">
                    {error}
                  </Text>
                </Box>
              ) : null}

              <Flex justify="flex-end" gap={3} flexWrap="wrap">
                <Button
                  borderRadius="12px"
                  minH="11"
                  px={5}
                  color="white"
                  style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                  _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
                  transition="all 0.2s ease"
                  onClick={onApply}
                >
                  Apply Filter
                </Button>
                <Button
                  variant="outline"
                  borderRadius="12px"
                  minH="11"
                  px={4}
                  disabled={!hasAppliedFilters}
                  onClick={onClear}
                >
                  Clear Filter
                </Button>
              </Flex>
            </Stack>
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}

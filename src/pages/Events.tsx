import { useState, useMemo } from "react"
import {
  Box,
  Button,
  Flex,
  Grid,
  Input,
  InputGroup,
  Heading,
  HStack,
  Table,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Text,
  Badge,
} from "@chakra-ui/react"
import ReactSelect, { components, type MultiValue, type OptionProps, type StylesConfig } from "react-select"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Filter, LayoutGrid, List, Plus, Search, Table2 } from "lucide-react"
import { EventCard } from "../components/events/EventCard"
import { OrganizerEventTableRow } from "@/components/events/OrganizerEventTableRow"
import { EventFormModal } from "../components/events/EventFormModal"
import { StyledSelect } from "../components/common/StyledSelect"
import { mockEvents } from "../data/mock"
import type { AppEvent } from "../types"
import { type OrganizerEventListFilters } from "@/api/events"
import { APP_ROUTES } from "@/utils/routes"
import { useOrganizerEvents } from "@/hooks/useOrganizerEvents"
import { useOrganizerVenues } from "@/features/events/hooks/useOrganizerVenues"
import { useOrganizerEventStatusOptions } from "@/features/events/hooks/useOrganizerEventStatusOptions"
import { OrganizerEventCard } from "@/components/events/OrganizerEventCard"
import { extractApiError } from "@/utils/errors"

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "conference", label: "Conference" },
  { value: "workshop", label: "Workshop" },
  { value: "seminar", label: "Seminar" },
  { value: "networking", label: "Networking" },
  { value: "webinar", label: "Webinar" },
  { value: "hackathon", label: "Hackathon" },
  { value: "concert", label: "Concert" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
]

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "All Setup States" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const REAL_PAGE_SIZE = 6

interface SelectOption {
  label: string
  value: string
}

function createEmptyOrganizerEventFilters(): OrganizerEventListFilters {
  return {
    name: "",
    statuses: [],
    eventFrom: "",
    eventTo: "",
    venueUniqueIds: [],
  }
}

function getSelectedOptions(options: SelectOption[], values: string[]) {
  return options.filter((option) => values.includes(option.value))
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
          {props.isSelected ? "✓" : null}
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

const filterMultiSelectStyles: StylesConfig<SelectOption, true> = {
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

function buildPageNumbers(page: number, totalPages: number) {
  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)

  for (let current = start; current <= end; current += 1) {
    pages.push(current)
  }

  return pages
}

function RealEventsSkeleton() {
  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={6}>
      <Skeleton height="24px" width="220px" mb={3} />
      <SkeletonText noOfLines={2} mb={6} />
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Box key={index} borderRadius="20px" border="1px solid" borderColor="border.subtle" p={5}>
            <Skeleton height="8px" mb={4} />
            <Skeleton height="18px" width="60%" mb={3} />
            <SkeletonText noOfLines={4} />
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  )
}

export function Events() {
  const navigate = useNavigate()
  const [realPage, setRealPage] = useState(1)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true)
  const [draftEventFilters, setDraftEventFilters] = useState<OrganizerEventListFilters>(() =>
    createEmptyOrganizerEventFilters()
  )
  const [appliedEventFilters, setAppliedEventFilters] = useState<OrganizerEventListFilters>(() =>
    createEmptyOrganizerEventFilters()
  )
  const [events, setEvents] = useState<AppEvent[]>(mockEvents)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null)
  const [mockViewMode, setMockViewMode] = useState<"grid" | "list">("grid")
  const [realViewMode, setRealViewMode] = useState<"card" | "table">("card")
  const organizerVenuesQuery = useOrganizerVenues()
  const organizerEventStatusOptionsQuery = useOrganizerEventStatusOptions()
  const realEventsQuery = useOrganizerEvents(realPage, REAL_PAGE_SIZE, appliedEventFilters)

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchSearch =
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase()) ||
        e.organizer.toLowerCase().includes(search.toLowerCase())
      const matchCategory = !category || e.category === category
      const matchStatus = !status || e.status === status
      return matchSearch && matchCategory && matchStatus
    })
  }, [events, search, category, status])

  const realEvents = realEventsQuery.data?.items ?? []
  const realTotalPages = realEventsQuery.data?.totalPages ?? 0
  const realCurrentPage = realEventsQuery.data?.page ?? realPage
  const realPageNumbers = useMemo(
    () => buildPageNumbers(realCurrentPage, realTotalPages),
    [realCurrentPage, realTotalPages]
  )

  const venueOptions = useMemo(
    () =>
      organizerVenuesQuery.venues.map((venue) => ({
        value: venue.uniqueId,
        label: venue.name,
      })),
    [organizerVenuesQuery.venues]
  )

  const selectedStatusOptions = useMemo(
    () => getSelectedOptions(organizerEventStatusOptionsQuery.statusOptions, draftEventFilters.statuses ?? []),
    [draftEventFilters.statuses, organizerEventStatusOptionsQuery.statusOptions]
  )

  const selectedVenueOptions = useMemo(
    () => getSelectedOptions(venueOptions, draftEventFilters.venueUniqueIds ?? []),
    [draftEventFilters.venueUniqueIds, venueOptions]
  )

  const appliedFilterCount = [
    appliedEventFilters.name?.trim(),
    appliedEventFilters.statuses?.length ?? 0,
    appliedEventFilters.eventFrom,
    appliedEventFilters.eventTo,
    appliedEventFilters.venueUniqueIds?.length ?? 0,
  ].filter((item) => Boolean(item)).length

  const hasAppliedFilters = appliedFilterCount > 0

  function handleApplyEventFilters() {
    setAppliedEventFilters({
      name: draftEventFilters.name?.trim() ?? "",
      statuses: [...(draftEventFilters.statuses ?? [])],
      eventFrom: draftEventFilters.eventFrom ?? "",
      eventTo: draftEventFilters.eventTo ?? "",
      venueUniqueIds: [...(draftEventFilters.venueUniqueIds ?? [])],
    })
    setRealPage(1)
    setIsFiltersExpanded(true)
  }

  function handleClearEventFilters() {
    setDraftEventFilters(createEmptyOrganizerEventFilters())
    setAppliedEventFilters(createEmptyOrganizerEventFilters())
    setRealPage(1)
  }

  function handleSave(data: Partial<AppEvent>) {
    if (editingEvent) {
      setEvents((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? { ...e, ...data } : e))
      )
    } else {
      const newEvent: AppEvent = {
        ...(data as AppEvent),
        id: `e${Date.now()}`,
        attendees: 0,
        coverColor: ["#7551FF", "#422AFB", "#2196F3", "#3CB371", "#FF6B35", "#E91E8C"][
          Math.floor(Math.random() * 6)
        ],
      }
      setEvents((prev) => [newEvent, ...prev])
    }
    setEditingEvent(null)
  }

  function handleEdit(event: AppEvent) {
    setEditingEvent(event)
    setIsModalOpen(true)
  }

  const activeFilterCount = [category, status].filter(Boolean).length

  return (
    <Box>
      <Box
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="20px"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
        mb={8}
      >
        <Flex
          direction={{ base: "column", lg: "row" }}
          align={{ base: "stretch", lg: "center" }}
          justify="space-between"
          gap={4}
          mb={5}
        >
          <Box>
            <HStack gap={2} mb={2}>
              <Box color="brand.500">
                <LayoutGrid size={18} />
              </Box>
              <Text
                fontSize="xs"
                fontWeight="800"
                textTransform="uppercase"
                letterSpacing="0.12em"
                color="gray.500"
              >
                Event module
              </Text>
            </HStack>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
              Published events
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="2xl">
              Paginated read data from the event module. Switch between card and table layouts for a better overview.
            </Text>
          </Box>

          <Flex direction="column" align={{ base: "stretch", lg: "end" }} gap={2} w={{ base: "full", lg: "auto" }}>
            <Button
              borderRadius="12px"
              fontWeight="700"
              fontSize="sm"
              h="42px"
              px={5}
              onClick={() => navigate(APP_ROUTES.eventWizard.createBase)}
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)", color: "white" }}
              _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
              transition="all 0.2s ease"
              w={{ base: "full", lg: "auto" }}
            >
              <Plus size={16} />
              Create Event
            </Button>

            <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1}>
              Page {realCurrentPage} of {Math.max(realTotalPages, 1)}
            </Badge>
          </Flex>
        </Flex>

        <Box mb={5} borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="app.bg" overflow="hidden">
          <Box
            as="button"
            w="full"
            px={4}
            py={4}
            cursor="pointer"
            onClick={() => setIsFiltersExpanded((current) => !current)}
            _hover={{ bg: "gray.50", _dark: { bg: "navy.800" } }}
          >
            <Flex direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} justify="space-between" gap={3}>
              <Flex align="center" gap={2}>
                <Box color="text.secondary">
                  <Filter size={15} />
                </Box>
                <Text fontSize="sm" fontWeight="700" color="text.primary">
                  Filters
                </Text>
                {hasAppliedFilters ? (
                  <Badge colorPalette="brand" variant="solid" borderRadius="full" fontSize="10px" px={1.5}>
                    {appliedFilterCount}
                  </Badge>
                ) : null}
              </Flex>

              <Text fontSize="sm" color="text.secondary">
                Search events by name, setup states, running dates, and venue.
              </Text>

              <Flex align="center" gap={2} borderRadius="999px" px={3} minH="9" color="text.primary" fontSize="sm" fontWeight="700" pointerEvents="none">
                {isFiltersExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Flex>
            </Flex>
          </Box>

          {isFiltersExpanded ? (
            <Box px={4} pb={4}>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4} mb={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="text.primary" mb={2}>
                    Name
                  </Text>
                  <Input
                    value={draftEventFilters.name ?? ""}
                    onChange={(event) =>
                      setDraftEventFilters((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Search by event name"
                    borderRadius="16px"
                    borderColor="secondaryGray.100"
                    bg="app.bg"
                    fontSize="sm"
                    h="44px"
                    px={4}
                    _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)" }}
                    _dark={{ borderColor: "navy.600" }}
                  />
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color="text.primary" mb={2}>
                    Setup State
                  </Text>
                  <ReactSelect
                    isMulti
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    options={organizerEventStatusOptionsQuery.statusOptions}
                    value={selectedStatusOptions}
                    onChange={(values: MultiValue<SelectOption>) =>
                      setDraftEventFilters((current) => ({
                        ...current,
                        statuses: values.map((value) => value.value),
                      }))
                    }
                    placeholder={organizerEventStatusOptionsQuery.isLoading ? "Loading setup states..." : "Select setup states"}
                    styles={filterMultiSelectStyles}
                    components={{ Option: CheckboxOption }}
                    isDisabled={organizerEventStatusOptionsQuery.isLoading || organizerEventStatusOptionsQuery.isError}
                  />
                  {organizerEventStatusOptionsQuery.isError ? (
                    <Text mt={2} fontSize="xs" color="red.500">
                      {organizerEventStatusOptionsQuery.error}
                    </Text>
                  ) : null}
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color="text.primary" mb={2}>
                    Venue
                  </Text>
                  <ReactSelect
                    isMulti
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    options={venueOptions}
                    value={selectedVenueOptions}
                    onChange={(values: MultiValue<SelectOption>) =>
                      setDraftEventFilters((current) => ({
                        ...current,
                        venueUniqueIds: values.map((value) => value.value),
                      }))
                    }
                    placeholder={organizerVenuesQuery.isLoading ? "Loading venues..." : "Select venues"}
                    styles={filterMultiSelectStyles}
                    components={{ Option: CheckboxOption }}
                    isDisabled={organizerVenuesQuery.isLoading}
                  />
                  {organizerVenuesQuery.isError ? (
                    <Text mt={2} fontSize="xs" color="red.500">
                      {organizerVenuesQuery.error}
                    </Text>
                  ) : null}
                </Box>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="text.primary" mb={2}>
                    Event from
                  </Text>
                  <Input
                    type="date"
                    value={draftEventFilters.eventFrom ?? ""}
                    onChange={(event) =>
                      setDraftEventFilters((current) => ({
                        ...current,
                        eventFrom: event.target.value,
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
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color="text.primary" mb={2}>
                    Event to
                  </Text>
                  <Input
                    type="date"
                    value={draftEventFilters.eventTo ?? ""}
                    onChange={(event) =>
                      setDraftEventFilters((current) => ({
                        ...current,
                        eventTo: event.target.value,
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
                </Box>
              </SimpleGrid>

              <Flex justify="flex-end" gap={3} mt={5} flexWrap="wrap">
                <Button
                  variant="outline"
                  borderRadius="12px"
                  minH="11"
                  px={4}
                  disabled={!hasAppliedFilters}
                  onClick={handleClearEventFilters}
                >
                  Clear Filter
                </Button>
                <Button
                  borderRadius="12px"
                  minH="11"
                  px={5}
                  color="white"
                  style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                  _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
                  transition="all 0.2s ease"
                  onClick={handleApplyEventFilters}
                >
                  Apply Filter
                </Button>
              </Flex>
            </Box>
          ) : null}
        </Box>

        <Flex justify="flex-end" mb={5}>
          <Flex
            w={{ base: "full", md: "auto" }}
            border="1px solid"
            borderColor="border.subtle"
            borderRadius="12px"
            overflow="hidden"
            bg="app.bg"
          >
            <Box
              as="button"
              p={2}
              bg={realViewMode === "card" ? "brand.500" : "transparent"}
              color={realViewMode === "card" ? "white" : "text.secondary"}
              onClick={() => setRealViewMode("card")}
              transition="all 0.15s"
              _hover={realViewMode !== "card" ? { bg: "gray.100", _dark: { bg: "navy.700" } } : {}}
              aria-label="Card view"
            >
              <LayoutGrid size={16} />
            </Box>
            <Box
              as="button"
              p={2}
              bg={realViewMode === "table" ? "brand.500" : "transparent"}
              color={realViewMode === "table" ? "white" : "text.secondary"}
              onClick={() => setRealViewMode("table")}
              transition="all 0.15s"
              _hover={realViewMode !== "table" ? { bg: "gray.100", _dark: { bg: "navy.700" } } : {}}
              aria-label="Table view"
              flex="1"
            >
              <Table2 size={16} />
            </Box>
          </Flex>
        </Flex>

        {realEventsQuery.isError ? (
          <Box mb={4} p={4} borderRadius="16px" bg="red.50" border="1px solid" borderColor="red.200">
            <Text fontSize="sm" fontWeight="600" color="red.600">
              {extractApiError(realEventsQuery.error)}
            </Text>
          </Box>
        ) : null}

        {realEventsQuery.isLoading && !realEventsQuery.data ? (
          <RealEventsSkeleton />
        ) : realEvents.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            bg="app.bg"
            borderRadius="20px"
            py={16}
            gap={3}
          >
            <Flex
              w="64px"
              h="64px"
              borderRadius="20px"
              align="center"
              justify="center"
              bg="brand.50"
              _dark={{ bg: "navy.700" }}
            >
              <Search size={28} color="#7551FF" />
            </Flex>
            <Text fontSize="lg" fontWeight="700" color="text.primary">
              No published events found
            </Text>
            <Text fontSize="sm" color="text.secondary">
              Create an event in the wizard to make it appear here.
            </Text>
          </Flex>
        ) : realViewMode === "card" ? (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={5}>
            {realEvents.map((event) => (
              <OrganizerEventCard key={event.uniqueId} event={event} />
            ))}
          </SimpleGrid>
        ) : (
          <Box overflowX="auto" border="1px solid" borderColor="border.subtle" bg="app.bg">
            <Table.Root variant="line" size="sm" borderColor="border.subtle" minW={{ base: "920px", md: "auto" }}>
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Actions
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Event
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Setup State
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Date
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Venue
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" px={4} py={3} textAlign="center">
                    Tickets
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {realEvents.map((event) => (
                  <OrganizerEventTableRow key={event.uniqueId} event={event} />
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}

        <Flex
          mt={6}
          direction={{ base: "column", md: "row" }}
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          gap={3}
        >
          <Text fontSize="sm" color="gray.600">
            Page {realCurrentPage} of {Math.max(realTotalPages, 1)}
          </Text>

          <HStack gap={2} wrap="wrap">
            <Button
              minH="11"
              px={4}
              variant="outline"
              disabled={realCurrentPage <= 1 || realEventsQuery.isFetching}
              onClick={() => setRealPage((current) => Math.max(1, current - 1))}
            >
              <ArrowLeft size={16} />
              Previous
            </Button>
            {realPageNumbers.map((item) => (
              <Button
                key={item}
                minH="11"
                px={4}
                variant={item === realCurrentPage ? "solid" : "outline"}
                bg={item === realCurrentPage ? "brand.500" : undefined}
                color={item === realCurrentPage ? "white" : undefined}
                disabled={realEventsQuery.isFetching}
                onClick={() => setRealPage(item)}
              >
                {item}
              </Button>
            ))}
            <Button
              minH="11"
              px={4}
              variant="outline"
              disabled={realCurrentPage >= realTotalPages || realEventsQuery.isFetching}
              onClick={() => setRealPage((current) => current + 1)}
            >
              Next
              <ArrowRight size={16} />
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="20px"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        {/* Header */}
        <Flex align="flex-start" justify="space-between" mb={6}>
          <Box>
          <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.12em" color="gray.500">
            Legacy mock preview
          </Text>
            <Text fontSize="2xl" fontWeight="800" color="text.primary" letterSpacing="-0.02em" mt={1}>
              Mock Data Preview
            </Text>
            <Text fontSize="sm" color="text.secondary" mt={0.5}>
              {filtered.length} mock events{filtered.length !== events.length ? ` of ${events.length}` : ""}
            </Text>
          </Box>
        </Flex>

        {/* Filter bar */}
        <Flex
          gap={3}
          mb={6}
          align="center"
          flexWrap="wrap"
          p={4}
          bg="app.bg"
          borderRadius="16px"
          border="1px solid"
          borderColor="border.subtle"
        >
          <InputGroup startElement={<Search size={15} color="#718096" />} flex={{ base: "1 1 100%", md: 1 }} minW={{ base: "full", md: "200px" }}>
            <Input
              placeholder="Search events, locations, organizers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              borderRadius="12px"
              borderColor="border.subtle"
              bg="app.bg"
              fontSize="sm"
              pl="2.5rem"
              _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px #7551FF" }}
            />
          </InputGroup>

          <Flex align="center" gap={2} w={{ base: "full", md: "auto" }}>
            <Box color="text.secondary">
              <Filter size={15} />
            </Box>
            <Text fontSize="xs" fontWeight="700" color="text.secondary">
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <Badge colorPalette="brand" variant="solid" borderRadius="full" fontSize="10px" px={1.5}>
                {activeFilterCount}
              </Badge>
            )}
          </Flex>

          <Box w={{ base: "full", md: "160px" }}>
            <StyledSelect
              options={CATEGORIES}
              value={category}
              onChange={setCategory}
              placeholder="All Categories"
              size="sm"
            />
          </Box>

          <Box w={{ base: "full", md: "150px" }}>
            <StyledSelect
              options={STATUSES}
              value={status}
              onChange={setStatus}
              placeholder="All Setup States"
              size="sm"
            />
          </Box>

          {/* View toggle */}
          <Flex
            border="1px solid"
            borderColor="border.subtle"
            borderRadius="12px"
            overflow="hidden"
            bg="app.bg"
            w={{ base: "full", md: "auto" }}
          >
            <Box
              as="button"
              p={2}
              bg={mockViewMode === "grid" ? "brand.500" : "transparent"}
              color={mockViewMode === "grid" ? "white" : "text.secondary"}
              onClick={() => setMockViewMode("grid")}
              transition="all 0.15s"
              _hover={mockViewMode !== "grid" ? { bg: "gray.100", _dark: { bg: "navy.700" } } : {}}
            >
              <LayoutGrid size={16} />
            </Box>
            <Box
              as="button"
              p={2}
              bg={mockViewMode === "list" ? "brand.500" : "transparent"}
              color={mockViewMode === "list" ? "white" : "text.secondary"}
              onClick={() => setMockViewMode("list")}
              transition="all 0.15s"
              _hover={mockViewMode !== "list" ? { bg: "gray.100", _dark: { bg: "navy.700" } } : {}}
            >
              <List size={16} />
            </Box>
          </Flex>
        </Flex>

        {/* Events grid */}
        {filtered.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            bg="app.bg"
            borderRadius="20px"
            py={16}
            gap={3}
          >
            <Flex
              w="64px"
              h="64px"
              borderRadius="20px"
              align="center"
              justify="center"
              bg="brand.50"
              _dark={{ bg: "navy.700" }}
            >
              <Search size={28} color="#7551FF" />
            </Flex>
            <Text fontSize="lg" fontWeight="700" color="text.primary">
              No events found
            </Text>
            <Text fontSize="sm" color="text.secondary">
              Try adjusting your search or filter criteria
            </Text>
            <Button
              size="sm"
              borderRadius="10px"
              variant="outline"
              fontWeight="600"
              onClick={() => {
                setSearch("")
                setCategory("")
                setStatus("")
              }}
            >
              Clear filters
            </Button>
          </Flex>
        ) : (
          <Grid templateColumns={mockViewMode === "grid" ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr"} gap={5}>
            {filtered.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={handleEdit}
              />
            ))}
          </Grid>
        )}

        <EventFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingEvent(null)
          }}
          event={editingEvent}
          onSave={handleSave}
        />
      </Box>
    </Box>
  )
}

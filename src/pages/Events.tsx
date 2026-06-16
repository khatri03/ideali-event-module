import { useState, useMemo } from "react"
import { format } from "date-fns"
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
import { useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, Filter, LayoutGrid, List, Plus, Search, Table2 } from "lucide-react"
import { EventCard } from "../components/events/EventCard"
import { EventFormModal } from "../components/events/EventFormModal"
import { StyledSelect } from "../components/common/StyledSelect"
import { mockEvents } from "../data/mock"
import type { AppEvent } from "../types"
import { APP_ROUTES } from "@/utils/routes"
import { useOrganizerEvents } from "@/hooks/useOrganizerEvents"
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
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const REAL_PAGE_SIZE = 6

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

function formatRealEventDate(date: string | null) {
  return date ? format(new Date(date), "MMM d, yyyy") : "Not set"
}


export function Events() {
  const navigate = useNavigate()
  const [realPage, setRealPage] = useState(1)
  const [events, setEvents] = useState<AppEvent[]>(mockEvents)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null)
  const [mockViewMode, setMockViewMode] = useState<"grid" | "list">("grid")
  const [realViewMode, setRealViewMode] = useState<"card" | "table">("card")
  const realEventsQuery = useOrganizerEvents(realPage, REAL_PAGE_SIZE)

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
            <Flex
              w={{ base: "full", lg: "auto" }}
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

            <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1}>
              Page {realCurrentPage} of {Math.max(realTotalPages, 1)}
            </Badge>
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
            <Table.Root variant="line" size="sm" borderColor="border.subtle" minW={{ base: "760px", md: "auto" }}>
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Event
                  </Table.ColumnHeader>
                  <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                    Status
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
                {realEvents.map((event) => {
                  const totalTickets = event.totalAvailableTickets + event.ticketsSold
                  const soldPct = totalTickets > 0 ? Math.round((event.ticketsSold / totalTickets) * 100) : 0

                  return (
                    <Table.Row key={event.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                        <Flex align="center" gap={3}>
                          <Box minW={0}>
                            <Text fontWeight="700" color="text.primary" lineClamp={1}>
                              {event.name}
                            </Text>
                          </Box>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4}>
                        <Badge
                          colorPalette={event.isCancelled ? "red" : "gray"}
                          variant="subtle"
                          borderRadius="full"
                          px={3}
                          py={1}
                          fontSize="10px"
                          fontWeight="800"
                          textTransform="uppercase"
                          letterSpacing="0.08em"
                        >
                          {event.isCancelled ? "Cancelled" : event.setupState.replace(/([a-z])([A-Z])/g, "$1 $2")}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} fontSize="sm" color="text.secondary" whiteSpace="nowrap">
                        {formatRealEventDate(event.startDate)} to {formatRealEventDate(event.endDate)}
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} textAlign="left" fontSize="sm" color="text.secondary">
                        {event.venueName ?? "Venue not mapped yet"}
                      </Table.Cell>
                      <Table.Cell borderColor="border.subtle" px={4} py={4} textAlign="left">
                        <Text fontSize="sm" fontWeight="700" color="text.primary">
                          {event.ticketsSold.toLocaleString()} / {totalTickets.toLocaleString()}
                        </Text>
                        <Text fontSize="xs" color="text.secondary">
                          {soldPct}% sold
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
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
          >
            <Plus size={16} />
            Create Event
          </Button>
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

          <StyledSelect
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
            placeholder="All Categories"
            size="sm"
            minW={{ base: "full", md: "160px" }}
          />

          <StyledSelect
            options={STATUSES}
            value={status}
            onChange={setStatus}
            placeholder="All Statuses"
            size="sm"
            minW={{ base: "full", md: "150px" }}
          />

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

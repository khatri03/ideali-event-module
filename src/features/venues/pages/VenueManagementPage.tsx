import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { Badge, Box, Button, CloseButton, Dialog, Flex, Heading, Input, InputGroup, Menu, Portal, SimpleGrid, Stack, Text, Tooltip } from "@chakra-ui/react"
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarPlus, MapPin, MoreHorizontal, PencilLine, Plus, Search, Sparkles } from "lucide-react"
import { StyledSelect } from "@/components/common/StyledSelect"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import {
  createOrganizerVenue,
  fetchOrganizerVenueManagementList,
  updateOrganizerVenue,
  type OrganizerVenueManagementItem,
} from "@/api/organizer"
import { toaster } from "@/lib/toaster"
import { useNavigate } from "react-router-dom"

type VenueSortBy = "name"
type VenueSortOrder = "asc" | "desc"

interface VenueFiltersState {
  name: string
}

interface VenueFormState {
  name: string
  mapUrl: string
  latitude: string
  longitude: string
}

const PAGE_SIZE = 10

const EMPTY_FILTERS: VenueFiltersState = {
  name: "",
}

const EMPTY_FORM: VenueFormState = {
  name: "",
  mapUrl: "",
  latitude: "",
  longitude: "",
}

const actionButtonStyles = {
  w: "40px",
  h: "40px",
  minW: "40px",
  borderRadius: "999px",
  border: "1px solid",
  borderColor: "border.subtle",
  bg: "white",
  color: "text.primary",
  _hover: { bg: "gray.50", borderColor: "gray.200" },
  _dark: { bg: "navy.800", borderColor: "whiteAlpha.200", _hover: { bg: "whiteAlpha.100" } },
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

function countAppliedFilters(filters: VenueFiltersState) {
  return [filters.name?.trim()].filter((value) => Boolean(value)).length
}

function SortHeaderButton({
  label,
  sortKey,
  currentSortBy,
  sortOrder,
  onSort,
}: {
  label: string
  sortKey: VenueSortBy
  currentSortBy: VenueSortBy | null
  sortOrder: VenueSortOrder
  onSort: (sortBy: VenueSortBy) => void
}) {
  const isActive = currentSortBy === sortKey
  const tooltipLabel = isActive ? (sortOrder === "asc" ? "Ascending" : "Descending") : "Sort ascending"

  return (
    <Button
      type="button"
      variant="ghost"
      color={isActive ? "brand.500" : "text.primary"}
      px={0}
      minH="auto"
      h="auto"
      fontSize="sm"
      fontWeight="800"
      onClick={() => onSort(sortKey)}
      cursor="pointer"
      aria-pressed={isActive}
      aria-label={`${label}, ${tooltipLabel}`}
      title={tooltipLabel}
    >
      <Flex align="center" justify="center" gap={1}>
        <Text as="span">{label}</Text>
        {isActive ? (sortOrder === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />) : <ArrowUpDown size={13} aria-hidden="true" />}
      </Flex>
    </Button>
  )
}

function VenueListSkeleton() {
  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={5}>
      <Box h="28px" w="240px" bg="gray.100" borderRadius="10px" mb={3} />
      <Box h="54px" bg="gray.100" borderRadius="14px" mb={4} />
      <Box h="54px" bg="gray.100" borderRadius="14px" mb={4} />
      <Box h="420px" bg="gray.100" borderRadius="16px" />
    </Box>
  )
}

function VenueFiltersCard({
  isExpanded,
  filterCount,
  hasAppliedFilters,
  draftFilters,
  onToggleExpanded,
  onApply,
  onClear,
  onDraftFiltersChange,
}: {
  isExpanded: boolean
  filterCount: number
  hasAppliedFilters: boolean
  draftFilters: VenueFiltersState
  onToggleExpanded: () => void
  onApply: () => void
  onClear: () => void
  onDraftFiltersChange: (updater: (current: VenueFiltersState) => VenueFiltersState) => void
}) {
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
              <MapPin size={15} />
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
            {isExpanded ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </Flex>
        </Flex>
      </Box>

      {isExpanded ? (
        <Box px={4} pb={4}>
          <Box borderRadius="18px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={{ base: 4, md: 5 }} shadow="sm">
            <Stack gap={5}>
              <SimpleGrid columns={{ base: 1, lg: 3 }} gap={4}>
                <Box minW={0}>
                  <Text fontSize="sm" fontWeight="700" color="text.primary" mb={2}>
                    Name
                  </Text>
                  <Input
                    value={draftFilters.name}
                    onChange={(event) =>
                      onDraftFiltersChange((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Search by venue name"
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
                <Button variant="outline" borderRadius="12px" minH="11" px={4} disabled={!hasAppliedFilters} onClick={onClear}>
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

export function VenueManagementPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true)
  const [draftFilters, setDraftFilters] = useState<VenueFiltersState>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<VenueFiltersState>(EMPTY_FILTERS)
  const [sortBy, setSortBy] = useState<VenueSortBy | null>(null)
  const [sortOrder, setSortOrder] = useState<VenueSortOrder>("asc")
  const [isVenueDialogOpen, setIsVenueDialogOpen] = useState(false)
  const [editingVenue, setEditingVenue] = useState<OrganizerVenueManagementItem | null>(null)
  const [venueForm, setVenueForm] = useState<VenueFormState>(EMPTY_FORM)
  const [venueError, setVenueError] = useState("")

  const venuesQuery = useQuery({
    queryKey: ["venues", { page, filters: appliedFilters, sortBy, sortOrder }],
        queryFn: () =>
          fetchOrganizerVenueManagementList(
            {
              name: appliedFilters.name?.trim() || undefined,
              sortBy: sortBy ?? undefined,
              sortOrder: sortBy ? sortOrder : undefined,
            },
        page,
        PAGE_SIZE,
      ),
    placeholderData: keepPreviousData,
  })

  const createVenueMutation = useMutation({
    mutationFn: async (payload: VenueFormState) => {
      const name = payload.name.trim()
      if (!name) {
        throw new Error("Venue name is required.")
      }

      return editingVenue
        ? updateOrganizerVenue(editingVenue.uniqueId, buildVenuePayload(payload))
        : createOrganizerVenue(buildVenuePayload(payload))
    },
    onSuccess: async (savedVenue) => {
      await queryClient.invalidateQueries({ queryKey: ["venues"] })
      await queryClient.invalidateQueries({ queryKey: ["organizer", "venues"] })
      setVenueError("")
      setIsVenueDialogOpen(false)
      setEditingVenue(null)
      setVenueForm(EMPTY_FORM)
      toaster.create({
        type: "success",
        title: editingVenue ? "Venue updated" : "Venue saved",
        description: savedVenue.name,
      })
    },
    onError: (error) => {
      setVenueError(extractApiError(error))
      toaster.create({
        type: "error",
        title: extractApiError(error),
      })
    },
  })

  const venues = venuesQuery.data?.items ?? []
  const totalPages = venuesQuery.data?.totalPages ?? 0
  const currentPage = venuesQuery.data?.page ?? page
  const pageNumbers = useMemo(() => buildPageNumbers(currentPage, totalPages), [currentPage, totalPages])
  const appliedFilterCount = countAppliedFilters(appliedFilters)
  const hasAppliedFilters = appliedFilterCount > 0

  useEffect(() => {
    if (!isVenueDialogOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isVenueDialogOpen])

  function handleApplyFilters() {
    setAppliedFilters({
      name: draftFilters.name?.trim() ?? "",
    })
    setPage(1)
    setIsFiltersExpanded(true)
  }

  function handleClearFilters() {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  function handleSort(nextSortBy: VenueSortBy) {
    setPage(1)
    setSortBy((currentSortBy) => {
      if (currentSortBy === nextSortBy) {
        setSortOrder((currentOrder) => (currentOrder === "asc" ? "desc" : "asc"))
        return currentSortBy
      }

      setSortOrder("asc")
      return nextSortBy
    })
  }

  function handleClearSort() {
    setSortBy(null)
    setSortOrder("asc")
    setPage(1)
  }

  function openCreateDialog() {
    setEditingVenue(null)
    setVenueForm(EMPTY_FORM)
    setVenueError("")
    setIsVenueDialogOpen(true)
  }

  function openEditDialog(venue: OrganizerVenueManagementItem) {
    setEditingVenue(venue)
    setVenueForm({
      name: venue.name,
      mapUrl: venue.mapUrl ?? "",
      latitude: venue.latitude?.toString() ?? "",
      longitude: venue.longitude?.toString() ?? "",
    })
    setVenueError("")
    setIsVenueDialogOpen(true)
  }

  function handleSaveVenue() {
    setVenueError("")
    createVenueMutation.mutate(venueForm)
  }

  return (
    <Stack gap={6}>
      <Box
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="20px"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Flex direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} justify="space-between" gap={4}>
          <Flex align="center" gap={3}>
            <Flex
              w="64px"
              h="64px"
              borderRadius="18px"
              align="center"
              justify="center"
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
              flexShrink={0}
            >
              <Sparkles size={28} color="white" fill="white" />
            </Flex>
            <Box>
              <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1} mb={2}>
                Venues
              </Badge>
              <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
                Venues
              </Heading>
              <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl">
                Manage venues with backend-owned filters, sorting, pagination, and edit dialogs without touching the wizard dropdown feed.
              </Text>
            </Box>
          </Flex>

          <Flex gap={3} direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "center" }} alignSelf={{ base: "stretch", md: "auto" }}>
            <Button variant="ghost" onClick={() => navigate(APP_ROUTES.sessionWizard.list)} alignSelf={{ base: "stretch", sm: "auto" }}>
              <Flex align="center" gap={2}>
                <CalendarPlus size={16} />
                <Text>Back to sessions</Text>
              </Flex>
            </Button>

            <Tooltip.Root openDelay={300} closeDelay={120}>
              <Tooltip.Trigger asChild>
                <Button
                  onClick={openCreateDialog}
                  alignSelf={{ base: "stretch", sm: "auto" }}
                  borderRadius="12px"
                  minH="11"
                  px={5}
                  color="white"
                  style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                  _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
                  transition="all 0.2s ease"
                >
                  <Plus size={16} />
                  Create
                </Button>
              </Tooltip.Trigger>
              <Portal>
                <Tooltip.Positioner>
                  <Tooltip.Content>Create venue</Tooltip.Content>
                </Tooltip.Positioner>
              </Portal>
            </Tooltip.Root>
          </Flex>
        </Flex>
      </Box>

      <VenueFiltersCard
        isExpanded={isFiltersExpanded}
        filterCount={appliedFilterCount}
        hasAppliedFilters={hasAppliedFilters}
        draftFilters={draftFilters}
        onToggleExpanded={() => setIsFiltersExpanded((current) => !current)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onDraftFiltersChange={setDraftFilters}
      />

      {venuesQuery.isLoading && venues.length === 0 ? (
        <VenueListSkeleton />
      ) : venuesQuery.isError ? (
        <Box p={4} borderRadius="16px" bg="red.50" border="1px solid" borderColor="red.200">
          <Text fontSize="sm" fontWeight="600" color="red.600">
            {extractApiError(venuesQuery.error)}
          </Text>
        </Box>
      ) : venues.length === 0 ? (
        <Flex direction="column" align="center" justify="center" bg="app.bg" borderRadius="20px" py={16} gap={3}>
          <Flex w="64px" h="64px" borderRadius="20px" align="center" justify="center" bg="brand.50" _dark={{ bg: "navy.700" }}>
            <MapPin size={28} color="#7551FF" />
          </Flex>
          <Text fontSize="lg" fontWeight="700" color="text.primary">
            No venues found
          </Text>
          <Text fontSize="sm" color="text.secondary">
            Try adjusting your filters or create a new venue.
          </Text>
          {sortBy ? (
            <Button size="sm" borderRadius="10px" variant="outline" fontWeight="600" onClick={handleClearSort}>
              Clear sort
            </Button>
          ) : null}
        </Flex>
      ) : (
        <Box>
          <Flex justify="space-between" align="center" gap={3} mb={3} flexWrap="wrap">
            <Text fontSize="sm" color="gray.600">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </Text>
            {sortBy ? (
              <Button variant="outline" borderRadius="12px" minH="11" px={4} onClick={handleClearSort}>
                Clear sort
              </Button>
            ) : null}
          </Flex>

          <Box overflowX="auto" border="1px solid" borderColor="border.subtle" bg="app.bg" borderRadius="16px">
            <table style={{ width: "100%", minWidth: "1100px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--chakra-colors-app-bg)" }}>
                  <th style={thStyle}>Actions</th>
                  <th style={thStyle}>
                    <SortHeaderButton label="Name" sortKey="name" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th style={thStyle}>Map URL</th>
                </tr>
              </thead>
              <tbody>
                {venues.map((venue) => (
                  <tr key={venue.uniqueId} style={{ borderTop: "1px solid var(--chakra-colors-border-subtle)" }}>
                    <td style={tdStyle}>
                      <Flex justify="center">
                        <Menu.Root positioning={{ placement: "bottom-start" }}>
                          <Menu.Trigger asChild>
                            <Box as="button" aria-label={`Actions for ${venue.name}`} cursor="pointer" {...actionButtonStyles}>
                              <Flex align="center" justify="center" w="full" h="full">
                                <MoreHorizontal size={18} aria-hidden="true" />
                              </Flex>
                            </Box>
                          </Menu.Trigger>
                          <Portal>
                            <Menu.Positioner>
                              <Menu.Content
                                minW="12rem"
                                borderRadius="16px"
                                border="1px solid"
                                borderColor="gray.200"
                                boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                                p={1.5}
                                bg="white"
                                _dark={{ bg: "navy.800", borderColor: "whiteAlpha.200" }}
                              >
                                <Menu.Item
                                  value="edit-venue"
                                  borderRadius="10px"
                                  fontSize="sm"
                                  fontWeight="600"
                                  color="gray.700"
                                  _dark={{ color: "gray.200" }}
                                  _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                                  px={3}
                                  py={2}
                                  gap={2.5}
                                  onClick={() => openEditDialog(venue)}
                                >
                                  <PencilLine size={14} />
                                  <Text as="span" flex="1" textAlign="left">
                                    Edit
                                  </Text>
                                </Menu.Item>
                              </Menu.Content>
                            </Menu.Positioner>
                          </Portal>
                        </Menu.Root>
                      </Flex>
                    </td>
                    <td style={tdStyle}>
                      <Text fontSize="sm" fontWeight="700" color="text.primary">
                        {venue.name}
                      </Text>
                    </td>
                    <td style={tdStyle}>
                      <Text fontSize="sm" color="text.secondary" lineClamp={1}>
                        {venue.mapUrl || "Not set"}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          <Flex justify="space-between" align="center" mt={4} gap={3} flexWrap="wrap">
            <Text fontSize="sm" color="gray.600">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </Text>
            <Flex gap={2} align="center" wrap="wrap" justify="flex-end">
              <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </Button>
              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={pageNumber === currentPage ? "solid" : "outline"}
                  onClick={() => setPage(pageNumber)}
                  minW="42px"
                  colorPalette={pageNumber === currentPage ? "brand" : undefined}
                >
                  {pageNumber}
                </Button>
              ))}
              <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages || 1, current + 1))}>
                Next
              </Button>
            </Flex>
          </Flex>
        </Box>
      )}

      <Dialog.Root
        open={isVenueDialogOpen}
        onOpenChange={(details) => {
          setIsVenueDialogOpen(details.open)
          if (!details.open) {
            setEditingVenue(null)
            setVenueForm(EMPTY_FORM)
            setVenueError("")
          }
        }}
        size="lg"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              bg="white"
              borderRadius="24px"
              border="1px solid"
              borderColor="gray.200"
              boxShadow="0 24px 60px rgba(15, 23, 42, 0.18)"
              maxW="640px"
              m="auto"
              p={{ base: 3, md: 4 }}
            >
              <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.100" borderRadius="20px 20px 0 0">
                <Flex align="flex-start" justify="space-between" gap={4}>
                  <Box>
                    <Text fontSize="lg" fontWeight="800" color="gray.900">
                      {editingVenue ? "Edit venue" : "Add venue"}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {editingVenue ? "Update the venue details and save." : "Create a new venue for the organizer."}
                    </Text>
                  </Box>

                  <Dialog.CloseTrigger asChild>
                    <CloseButton aria-label="Close venue modal" />
                  </Dialog.CloseTrigger>
                </Flex>
              </Box>

              <Dialog.Body px={6} py={6}>
                <Stack gap={4}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box>
                      <Text fontSize="sm" fontWeight="700" color="gray.800" mb={2}>
                        Name <Text as="span" color="red.500">*</Text>
                      </Text>
                      <Input
                        ref={nameInputRef}
                        value={venueForm.name}
                        onChange={(event) =>
                          setVenueForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Venue name"
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
                      <Text fontSize="sm" fontWeight="700" color="gray.800" mb={2}>
                        Map URL
                      </Text>
                      <InputGroup
                        endElement={
                          <Tooltip.Root openDelay={300} closeDelay={120}>
                            <Tooltip.Trigger asChild>
                              <Button
                                variant="ghost"
                                aria-label="Search map"
                                cursor="pointer"
                                color="gray.500"
                                minW="8"
                                h="8"
                                px={0}
                                _hover={{ color: "brand.500" }}
                                onClick={() => {
                                  const query = venueForm.name.trim()
                                  window.open(buildGoogleMapsSearchUrl(query), "_blank", "noopener,noreferrer")
                                }}
                              >
                                <Search size={16} />
                              </Button>
                            </Tooltip.Trigger>
                            <Portal>
                              <Tooltip.Positioner>
                                <Tooltip.Content>Search map</Tooltip.Content>
                              </Tooltip.Positioner>
                            </Portal>
                          </Tooltip.Root>
                        }
                      >
                        <Input
                          value={venueForm.mapUrl}
                          onChange={(event) =>
                            setVenueForm((current) => ({
                              ...current,
                              mapUrl: event.target.value,
                            }))
                          }
                          placeholder="Paste Google Maps share link"
                          borderRadius="16px"
                          borderColor="secondaryGray.100"
                          bg="app.bg"
                          fontSize="sm"
                          h="44px"
                          pl={4}
                          pr={12}
                          _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)" }}
                          _dark={{ borderColor: "navy.600" }}
                        />
                      </InputGroup>
                      <Text mt={2} fontSize="xs" color="gray.500">
                        Search in Maps, then paste the share URL here.
                      </Text>
                    </Box>
                  </SimpleGrid>

                  {venueError ? (
                    <Box p={3.5} borderRadius="14px" border="1px solid" borderColor="red.200" bg="red.50">
                      <Text fontSize="sm" fontWeight="600" color="red.700">
                        {venueError}
                      </Text>
                    </Box>
                  ) : null}
                </Stack>
              </Dialog.Body>

              <Box px={6} pb={6} pt={4} borderTop="1px solid" borderColor="gray.100" borderRadius="0 0 20px 20px">
                <Flex justify="flex-end" gap={3} w="full" flexWrap="wrap">
                  <Button variant="outline" borderRadius="12px" minH="11" px={4} onClick={() => setIsVenueDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    borderRadius="12px"
                    minH="11"
                    px={5}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
                    transition="all 0.2s ease"
                    onClick={handleSaveVenue}
                    loading={createVenueMutation.isPending}
                    loadingText={editingVenue ? "Updating..." : "Saving..."}
                  >
                    {editingVenue ? "Update" : "Save"}
                  </Button>
                </Flex>
              </Box>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Stack>
  )
}

function buildVenuePayload(payload: VenueFormState) {
  return {
    name: payload.name.trim(),
    mapUrl: payload.mapUrl.trim() || null,
    latitude: parseNumericField(payload.latitude),
    longitude: parseNumericField(payload.longitude),
  }
}

function parseNumericField(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function buildGoogleMapsSearchUrl(query: string) {
  const normalizedQuery = query.trim()
  const target = normalizedQuery ? encodeURIComponent(normalizedQuery) : "maps"
  return `https://www.google.com/maps/search/?api=1&query=${target}`
}

const thStyle: CSSProperties = {
  padding: "12px 16px",
  textAlign: "center",
  fontSize: "14px",
  fontWeight: 800,
  color: "#1f2a44",
  borderRight: "1px solid var(--chakra-colors-border-subtle)",
  borderBottom: "1px solid var(--chakra-colors-border-subtle)",
  whiteSpace: "nowrap",
}

const tdStyle: CSSProperties = {
  padding: "16px",
  verticalAlign: "top",
  borderRight: "1px solid var(--chakra-colors-border-subtle)",
}

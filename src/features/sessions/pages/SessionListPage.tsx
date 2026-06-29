import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge, Box, Button, CloseButton, Dialog, Flex, Heading, Input, Portal, Stack, Text, Tooltip } from "@chakra-ui/react"
import { CalendarPlus, Plus, Sparkles } from "lucide-react"
import { APP_ROUTES } from "@/utils/routes"
import { extractApiError } from "@/utils/errors"
import { useSessionFilterOptions, useSessionList } from "../hooks"
import { SessionFiltersCard } from "../components/SessionFiltersCard"
import { SessionListTable, type SessionSortBy, type SessionSortOrder } from "../components/SessionListTable"
import type { SessionListFilters } from "@/api/sessions"
import { createEventWizardSession } from "@/api/events"
import { fetchOrganizerEvents, type OrganizerEventOption } from "@/api/organizer"
import { StyledSelect } from "@/components/common/StyledSelect"
import { useMutation, useQuery } from "@tanstack/react-query"

const PAGE_SIZE = 10

function createEmptySessionFilters(): SessionListFilters {
  return {
    name: "",
    genreUniqueIds: [],
    eventUniqueIds: [],
    venueUniqueIds: [],
    bookingStatuses: [],
    seatEnabled: [],
    startFrom: "",
    startTo: "",
  }
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

function countAppliedFilters(filters: SessionListFilters) {
  return [
    filters.name?.trim(),
    filters.genreUniqueIds?.length ?? 0,
    filters.eventUniqueIds?.length ?? 0,
    filters.venueUniqueIds?.length ?? 0,
    filters.bookingStatuses?.length ?? 0,
    filters.seatEnabled?.length ?? 0,
    filters.startFrom,
    filters.startTo,
  ].filter((value) => Boolean(value)).length
}

interface CreateSessionFormState {
  eventUniqueId: string
  name: string
}

function createEmptyCreateSessionForm(): CreateSessionFormState {
  return {
    eventUniqueId: "",
    name: "",
  }
}

export function SessionListPage() {
  const navigate = useNavigate()
  const sessionNameInputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true)
  const [draftFilters, setDraftFilters] = useState<SessionListFilters>(() => createEmptySessionFilters())
  const [appliedFilters, setAppliedFilters] = useState<SessionListFilters>(() => createEmptySessionFilters())
  const [sortBy, setSortBy] = useState<SessionSortBy | null>(null)
  const [sortOrder, setSortOrder] = useState<SessionSortOrder>("asc")
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false)
  const [createSessionForm, setCreateSessionForm] = useState<CreateSessionFormState>(() => createEmptyCreateSessionForm())
  const [createSessionError, setCreateSessionError] = useState("")

  const filterOptionsQuery = useSessionFilterOptions()
  const organizerEventsQuery = useQuery({
    queryKey: ["sessions", "create-session", "events"],
    queryFn: fetchOrganizerEvents,
    staleTime: 1000 * 60 * 30,
  })
  const sessionsQuery = useSessionList(page, PAGE_SIZE, {
    ...appliedFilters,
    sortBy: sortBy ?? undefined,
    sortOrder: sortBy ? sortOrder : undefined,
  })
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const eventUniqueId = createSessionForm.eventUniqueId.trim()
      const name = createSessionForm.name.trim()

      if (!eventUniqueId) {
        throw new Error("Event is required.")
      }

      if (!name) {
        throw new Error("Session name is required.")
      }

      return createEventWizardSession(eventUniqueId, { name })
    },
    onSuccess: (createdSession) => {
      setIsCreateSessionOpen(false)
      setCreateSessionForm(createEmptyCreateSessionForm())
      setCreateSessionError("")
      navigate(APP_ROUTES.sessionWizard.edit(createdSession.uniqueId))
    },
    onError: (error: unknown) => {
      setCreateSessionError(extractApiError(error))
    },
  })

  const sessions = sessionsQuery.data?.items ?? []
  const totalPages = sessionsQuery.data?.totalPages ?? 0
  const currentPage = sessionsQuery.data?.page ?? page
  const pageNumbers = useMemo(() => buildPageNumbers(currentPage, totalPages), [currentPage, totalPages])
  const appliedFilterCount = countAppliedFilters(appliedFilters)
  const hasAppliedFilters = appliedFilterCount > 0
  const createEventOptions = useMemo(
    () =>
      (organizerEventsQuery.data ?? [])
        .map((event: OrganizerEventOption) => ({
          label: event.name,
          value: event.uniqueId,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [organizerEventsQuery.data],
  )

  useEffect(() => {
    if (!isCreateSessionOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      sessionNameInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isCreateSessionOpen])

  function handleApplyFilters() {
    setAppliedFilters({
      name: draftFilters.name?.trim() ?? "",
      genreUniqueIds: [...(draftFilters.genreUniqueIds ?? [])],
      eventUniqueIds: [...(draftFilters.eventUniqueIds ?? [])],
      venueUniqueIds: [...(draftFilters.venueUniqueIds ?? [])],
      bookingStatuses: [...(draftFilters.bookingStatuses ?? [])],
      seatEnabled: [...(draftFilters.seatEnabled ?? [])],
      startFrom: draftFilters.startFrom ?? "",
      startTo: draftFilters.startTo ?? "",
    })
    setPage(1)
    setIsFiltersExpanded(true)
  }

  function handleClearFilters() {
    const emptyFilters = createEmptySessionFilters()
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setPage(1)
  }

  function handleSort(nextSortBy: SessionSortBy) {
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

  function handleOpenCreateSession() {
    setCreateSessionError("")
    setCreateSessionForm(createEmptyCreateSessionForm())
    setIsCreateSessionOpen(true)
  }

  function handleCreateSession() {
    setCreateSessionError("")
    createSessionMutation.mutate()
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
                Sessions
              </Badge>
              <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
                Sessions
              </Heading>
              <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl">
                Browse sessions, filter by backend-owned options, and open any row to continue editing the wizard.
              </Text>
            </Box>
          </Flex>

          <Flex gap={3} direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "center" }} alignSelf={{ base: "stretch", md: "auto" }}>
            <Button variant="ghost" onClick={() => navigate(APP_ROUTES.events)} alignSelf={{ base: "stretch", sm: "auto" }}>
              <Flex align="center" gap={2}>
                <CalendarPlus size={16} />
                <Text>Back to events</Text>
              </Flex>
            </Button>

            <Tooltip.Root openDelay={300} closeDelay={120}>
              <Tooltip.Trigger asChild>
                <Button
                  onClick={handleOpenCreateSession}
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
                  <Tooltip.Content>Start the session wizard</Tooltip.Content>
                </Tooltip.Positioner>
              </Portal>
            </Tooltip.Root>
          </Flex>
        </Flex>
      </Box>

      <SessionFiltersCard
        isExpanded={isFiltersExpanded}
        filterCount={appliedFilterCount}
        hasAppliedFilters={hasAppliedFilters}
        draftFilters={draftFilters}
        filterOptions={filterOptionsQuery.filterOptions}
        isLoading={filterOptionsQuery.isLoading}
        isError={filterOptionsQuery.isError}
        error={filterOptionsQuery.error}
        onToggleExpanded={() => setIsFiltersExpanded((current) => !current)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onDraftFiltersChange={setDraftFilters}
      />

      <SessionListTable
        sessions={sessions}
        isLoading={sessionsQuery.isLoading && sessions.length === 0}
        isError={sessionsQuery.isError}
        errorMessage={extractApiError(sessionsQuery.error)}
        page={currentPage}
        totalPages={totalPages}
        pageNumbers={pageNumbers}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onPageChange={setPage}
        onSort={handleSort}
        onClearSort={handleClearSort}
        onOpenSession={(sessionId) => navigate(APP_ROUTES.sessionWizard.edit(sessionId))}
      />

      <Dialog.Root
        open={isCreateSessionOpen}
        onOpenChange={(details) => {
          setIsCreateSessionOpen(details.open)
          if (!details.open) {
            setCreateSessionError("")
            setCreateSessionForm(createEmptyCreateSessionForm())
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
              maxW="560px"
              m="auto"
            >
              <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.100">
                <Dialog.Title fontSize="xl" fontWeight="800" color="gray.900">
                  Start Session Wizard
                </Dialog.Title>
                <Dialog.Description color="gray.600" mt={1}>
                  Select an event and enter the session name to create the session and open the wizard.
                </Dialog.Description>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Box>

              <Dialog.Body py={5}>
                <Stack gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color="gray.800" mb={2}>
                      Event <Text as="span" color="red.500">*</Text>
                    </Text>
                    <StyledSelect
                      options={createEventOptions}
                      value={createSessionForm.eventUniqueId}
                      onChange={(value) =>
                        setCreateSessionForm((current) => ({
                          ...current,
                          eventUniqueId: value,
                        }))
                      }
                      placeholder={organizerEventsQuery.isLoading ? "Loading events..." : "Select event"}
                      disabled={organizerEventsQuery.isLoading || organizerEventsQuery.isError || createSessionMutation.isPending}
                    />
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="700" color="gray.800" mb={2}>
                      Session Name <Text as="span" color="red.500">*</Text>
                    </Text>
                    <Input
                      ref={sessionNameInputRef}
                      value={createSessionForm.name}
                      onChange={(event) =>
                        setCreateSessionForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Enter session name"
                      borderRadius="16px"
                      borderColor="secondaryGray.100"
                      bg="app.bg"
                      fontSize="sm"
                      h="44px"
                      px={4}
                      _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)" }}
                      _dark={{ borderColor: "navy.600" }}
                      disabled={createSessionMutation.isPending}
                    />
                  </Box>

                  {createSessionError ? (
                    <Box p={3.5} borderRadius="14px" border="1px solid" borderColor="red.200" bg="red.50">
                      <Text fontSize="sm" fontWeight="600" color="red.700">
                        {createSessionError}
                      </Text>
                    </Box>
                  ) : null}
                </Stack>
              </Dialog.Body>

              <Box px={6} pb={6} pt={4} borderTop="1px solid" borderColor="gray.100">
                <Flex justify="flex-end" gap={3} w="full" flexWrap="wrap">
                  <Button variant="outline" borderRadius="12px" minH="11" px={4} onClick={() => setIsCreateSessionOpen(false)}>
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
                      onClick={handleCreateSession}
                      loading={createSessionMutation.isPending}
                      loadingText="Starting..."
                      disabled={createSessionMutation.isPending || organizerEventsQuery.isLoading}
                    >
                      Start Wizard
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

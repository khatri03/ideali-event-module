import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge, Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react"
import { CalendarPlus, Sparkles } from "lucide-react"
import { APP_ROUTES } from "@/utils/routes"
import { extractApiError } from "@/utils/errors"
import { useSessionFilterOptions, useSessionList } from "../hooks"
import { SessionFiltersCard } from "../components/SessionFiltersCard"
import { SessionListTable, type SessionSortBy, type SessionSortOrder } from "../components/SessionListTable"
import type { SessionListFilters } from "@/api/sessions"

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

export function SessionListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true)
  const [draftFilters, setDraftFilters] = useState<SessionListFilters>(() => createEmptySessionFilters())
  const [appliedFilters, setAppliedFilters] = useState<SessionListFilters>(() => createEmptySessionFilters())
  const [sortBy, setSortBy] = useState<SessionSortBy | null>(null)
  const [sortOrder, setSortOrder] = useState<SessionSortOrder>("asc")

  const filterOptionsQuery = useSessionFilterOptions()
  const sessionsQuery = useSessionList(page, PAGE_SIZE, {
    ...appliedFilters,
    sortBy: sortBy ?? undefined,
    sortOrder: sortBy ? sortOrder : undefined,
  })

  const sessions = sessionsQuery.data?.items ?? []
  const totalPages = sessionsQuery.data?.totalPages ?? 0
  const currentPage = sessionsQuery.data?.page ?? page
  const pageNumbers = useMemo(() => buildPageNumbers(currentPage, totalPages), [currentPage, totalPages])
  const appliedFilterCount = countAppliedFilters(appliedFilters)
  const hasAppliedFilters = appliedFilterCount > 0

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

          <Button
            variant="ghost"
            onClick={() => navigate(APP_ROUTES.events)}
            alignSelf={{ base: "stretch", md: "auto" }}
          >
            <Flex align="center" gap={2}>
              <CalendarPlus size={16} />
              <Text>Back to events</Text>
            </Flex>
          </Button>
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
    </Stack>
  )
}

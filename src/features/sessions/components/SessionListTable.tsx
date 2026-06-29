import { format } from "date-fns"
import { Box, Badge, Button, Flex, HStack, Skeleton, SkeletonText, Table, Text } from "@chakra-ui/react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, CalendarDays, Eye, MapPin } from "lucide-react"
import { type SessionListItem } from "@/api/sessions"

export type SessionSortBy = "name" | "eventName" | "venue" | "bookingStatus" | "seatEnabled" | "startDate" | "endDate" | "ticketsSold"
export type SessionSortOrder = "asc" | "desc"

interface SessionListTableProps {
  sessions: SessionListItem[]
  isLoading: boolean
  isError: boolean
  errorMessage: string
  page: number
  totalPages: number
  pageNumbers: number[]
  sortBy: SessionSortBy | null
  sortOrder: SessionSortOrder
  onPageChange: (page: number) => void
  onSort: (sortBy: SessionSortBy) => void
  onClearSort: () => void
  onOpenSession: (sessionId: string) => void
}

function buildTotalTickets(session: SessionListItem) {
  return session.totalAvailableTickets + session.ticketsSold
}

function formatSessionDate(date: string | null) {
  return date ? format(new Date(date), "MMM d, yyyy") : "Not set"
}

function getBookingStatusPalette(status: string) {
  switch (status.toLowerCase()) {
    case "started":
      return "green"
    case "ended":
      return "gray"
    case "cancelled":
      return "red"
    default:
      return "blue"
  }
}

function SortHeaderButton({
  label,
  sortKey,
  currentSortBy,
  sortOrder,
  onSort,
}: {
  label: string
  sortKey: SessionSortBy
  currentSortBy: SessionSortBy | null
  sortOrder: SessionSortOrder
  onSort: (sortBy: SessionSortBy) => void
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
        {isActive ? (
          sortOrder === "asc" ? (
            <ArrowUp size={13} aria-hidden="true" />
          ) : (
            <ArrowDown size={13} aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown size={13} aria-hidden="true" />
        )}
      </Flex>
    </Button>
  )
}

function SessionListSkeleton() {
  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={5}>
      <Skeleton height="28px" width="240px" mb={3} />
      <SkeletonText noOfLines={2} mb={6} />
      <Skeleton height="54px" mb={4} />
      <SkeletonText noOfLines={7} />
    </Box>
  )
}

export function SessionListTable({
  sessions,
  isLoading,
  isError,
  errorMessage,
  page,
  totalPages,
  pageNumbers,
  sortBy,
  sortOrder,
  onPageChange,
  onSort,
  onClearSort,
  onOpenSession,
}: SessionListTableProps) {
  if (isLoading && sessions.length === 0) {
    return <SessionListSkeleton />
  }

  if (isError) {
    return (
      <Box p={4} borderRadius="16px" bg="red.50" border="1px solid" borderColor="red.200">
        <Text fontSize="sm" fontWeight="600" color="red.600">
          {errorMessage}
        </Text>
      </Box>
    )
  }

  if (sessions.length === 0) {
    return (
      <Flex direction="column" align="center" justify="center" bg="app.bg" borderRadius="20px" py={16} gap={3}>
        <Flex w="64px" h="64px" borderRadius="20px" align="center" justify="center" bg="brand.50" _dark={{ bg: "navy.700" }}>
          <Eye size={28} color="#7551FF" />
        </Flex>
        <Text fontSize="lg" fontWeight="700" color="text.primary">
          No sessions found
        </Text>
        <Text fontSize="sm" color="text.secondary">
          Try adjusting your filters or clear the current sort.
        </Text>
        {sortBy ? (
          <Button size="sm" borderRadius="10px" variant="outline" fontWeight="600" onClick={onClearSort}>
            Clear sort
          </Button>
        ) : null}
      </Flex>
    )
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" gap={3} mb={3} flexWrap="wrap">
        <Text fontSize="sm" color="gray.600">
          Page {page} of {Math.max(totalPages, 1)}
        </Text>

        {sortBy ? (
          <Button variant="outline" borderRadius="12px" minH="11" px={4} onClick={onClearSort}>
            Clear sort
          </Button>
        ) : null}
      </Flex>

      <Box overflowX="auto" border="1px solid" borderColor="border.subtle" bg="app.bg" borderRadius="16px">
        <Table.Root variant="line" size="sm" borderColor="border.subtle" minW={{ base: "1080px", md: "auto" }}>
          <Table.Header>
            <Table.Row bg="app.bg">
              <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                <SortHeaderButton label="Name" sortKey="name" currentSortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
              </Table.ColumnHeader>
              <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                <SortHeaderButton label="Event" sortKey="eventName" currentSortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
              </Table.ColumnHeader>
              <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                <SortHeaderButton label="Venue" sortKey="venue" currentSortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
              </Table.ColumnHeader>
              <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                <SortHeaderButton
                  label="Booking Status"
                  sortKey="bookingStatus"
                  currentSortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              </Table.ColumnHeader>
              <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                <SortHeaderButton label="Seat Enabled" sortKey="seatEnabled" currentSortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
              </Table.ColumnHeader>
              <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" borderRightWidth="1px" px={4} py={3} textAlign="center">
                <SortHeaderButton label="Session Dates" sortKey="startDate" currentSortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
              </Table.ColumnHeader>
              <Table.ColumnHeader borderColor="border.subtle" borderBottomWidth="1px" px={4} py={3} textAlign="center">
                <SortHeaderButton label="Tickets Sold" sortKey="ticketsSold" currentSortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sessions.map((session) => {
              const totalTickets = buildTotalTickets(session)
              const soldPct = totalTickets > 0 ? Math.round((session.ticketsSold / totalTickets) * 100) : 0

              return (
                <Table.Row key={session.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                  <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top">
                    <Button
                      variant="ghost"
                      px={0}
                      h="auto"
                      minH="auto"
                      justifyContent="flex-start"
                      onClick={() => onOpenSession(session.uniqueId)}
                      color="text.primary"
                      fontSize="sm"
                      fontWeight="800"
                      cursor="pointer"
                    >
                      {session.name}
                    </Button>
                    {session.genreNames.length > 0 ? (
                      <Flex wrap="wrap" gap={1.5} mt={2}>
                        {session.genreNames.slice(0, 5).map((genre) => (
                          <Badge
                            key={`${session.uniqueId}-${genre}`}
                            colorPalette="gray"
                            variant="subtle"
                            borderRadius="full"
                            px={2.5}
                            py={1}
                            fontSize="10px"
                            fontWeight="800"
                            textTransform="uppercase"
                            letterSpacing="0.08em"
                          >
                            {genre}
                          </Badge>
                        ))}
                      </Flex>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top" fontSize="sm" color="text.primary">
                    {session.eventName}
                  </Table.Cell>
                  <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top">
                    <Flex align="center" gap={2} color="text.primary" fontSize="sm">
                      <MapPin size={14} />
                      <Text>{session.venueName ?? "Not assigned"}</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top">
                    <Badge
                      colorPalette={getBookingStatusPalette(session.bookingStatus)}
                      variant="subtle"
                      borderRadius="full"
                      px={3}
                      py={1}
                      fontSize="10px"
                      fontWeight="800"
                      textTransform="uppercase"
                      letterSpacing="0.08em"
                    >
                      {session.bookingStatus || "Unknown"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top">
                    <Badge
                      colorPalette={session.offerPickingSeats ? "green" : "gray"}
                      variant="subtle"
                      borderRadius="full"
                      px={3}
                      py={1}
                      fontSize="10px"
                      fontWeight="800"
                      textTransform="uppercase"
                      letterSpacing="0.08em"
                    >
                      {session.offerPickingSeats ? "Yes" : "No"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top">
                    <Flex align="center" gap={2} fontSize="sm" color="text.secondary" whiteSpace="nowrap">
                      <CalendarDays size={14} />
                      <Text>
                        {formatSessionDate(session.startDate)} to {formatSessionDate(session.endDate)}
                      </Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell borderColor="border.subtle" px={4} py={4} verticalAlign="top">
                    <Text fontSize="sm" fontWeight="700" color="text.primary">
                      {session.ticketsSold.toLocaleString()}
                    </Text>
                    <Text fontSize="xs" color="text.secondary">
                      {soldPct}% sold of {totalTickets.toLocaleString()}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Box>

      <Flex
        mt={6}
        direction={{ base: "column", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        gap={3}
      >
        <Text fontSize="sm" color="gray.600">
          Page {page} of {Math.max(totalPages, 1)}
        </Text>

        <HStack gap={2} wrap="wrap">
          <Button minH="11" px={4} variant="outline" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            <ArrowLeft size={16} />
            Previous
          </Button>
          {pageNumbers.map((item) => (
            <Button
              key={item}
              minH="11"
              px={4}
              variant={item === page ? "solid" : "outline"}
              bg={item === page ? "brand.500" : undefined}
              color={item === page ? "white" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ))}
          <Button
            minH="11"
            px={4}
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ArrowRight size={16} />
          </Button>
        </HStack>
      </Flex>
    </Box>
  )
}

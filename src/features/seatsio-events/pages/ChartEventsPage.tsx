import { useNavigate, useParams } from "react-router-dom"
import { Box, Button, Flex, Heading, HStack, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react"
import { ArrowLeft, CalendarRange } from "lucide-react"
import type { SeatsIoChartEvent } from "@/api/seatsio"
import { APP_ROUTES } from "@/utils/routes"
import { extractApiError } from "@/utils/errors"
import { useChartEvents } from "../hooks/useChartEvents"
import { EventCard } from "../components/EventCard"

function EventsSkeleton() {
  return (
    <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} height="88px" borderRadius="16px" />
      ))}
    </SimpleGrid>
  )
}

export function ChartEventsPage() {
  const navigate = useNavigate()
  const { chartUniqueId = "" } = useParams()
  const query = useChartEvents(chartUniqueId)

  function handleOpenEvent(event: SeatsIoChartEvent) {
    navigate(APP_ROUTES.seatsIoEvents.report(event.uniqueId), {
      state: { eventLabel: event.label, chartUniqueId },
    })
  }

  const events = query.data ?? []

  return (
    <Box w="full">
      <Button
        variant="ghost"
        size="sm"
        mb={4}
        px={2}
        color="gray.600"
        onClick={() => navigate(APP_ROUTES.seatingLayouts.list)}
      >
        <ArrowLeft size={16} />
        Back to seating layouts
      </Button>

      <Stack gap={2} mb={6}>
        <HStack gap={2}>
          <Box color="brand.500">
            <CalendarRange size={18} />
          </Box>
          <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.12em" color="gray.500">
            Seats.io
          </Text>
        </HStack>
        <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
          Events
        </Heading>
        <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="2xl">
          Every event created against this layout. Open one to see its Seats.io reports.
        </Text>
      </Stack>

      {query.isError ? (
        <Box role="alert" borderRadius="14px" border="1px solid" borderColor="red.200" bg="red.50" px={4} py={4} mb={4}>
          <Text fontSize="sm" fontWeight="700" color="red.600">
            {extractApiError(query.error)}
          </Text>
        </Box>
      ) : null}

      {query.isLoading ? (
        <EventsSkeleton />
      ) : events.length === 0 && !query.isError ? (
        <Flex
          direction="column"
          align="center"
          gap={2}
          py={16}
          borderRadius="20px"
          border="1px dashed"
          borderColor="border.subtle"
          textAlign="center"
        >
          <Box color="gray.400">
            <CalendarRange size={30} />
          </Box>
          <Text fontSize="lg" fontWeight="700" color="gray.900">
            No events on this layout yet
          </Text>
          <Text fontSize="sm" color="gray.600" maxW="sm">
            Events appear here once a session is seated against this chart.
          </Text>
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          {events.map((event) => (
            <EventCard key={event.uniqueId} event={event} onOpen={handleOpenEvent} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  )
}

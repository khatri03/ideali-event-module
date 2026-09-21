import { useState } from "react"
import { Box, Flex, Skeleton, Stack, Text } from "@chakra-ui/react"
import { SeatsioSeatingChart } from "@seatsio/seatsio-react"
import { useEventRenderContext } from "../hooks/useEventReports"
import { resolveSeatsIoRegion } from "../utils/resolveSeatsIoRegion"

/**
 * What stands in for the chart when it cannot be drawn. Both the missing-setup and failed-render cases end the same
 * way for the organizer — no live map here — so both say so rather than leaving the frame empty, which reads as a
 * preview still loading that never arrives. The status breakdown beside it still tells the whole story.
 */
function ChartPreviewUnavailable({ message }: { message: string }) {
  return (
    <Stack
      role="status"
      justify="center"
      h={{ base: "220px", md: "300px" }}
      px={{ base: 4, md: 6 }}
      borderRadius="16px"
      border="1px solid"
      borderColor="border.subtle"
      bg="gray.50"
    >
      <Text fontSize="sm" fontWeight="600" color="gray.600">
        {message}
      </Text>
    </Stack>
  )
}

interface BookedProgress {
  booked: number
  total: number
}

/**
 * The compact booked-vs-available meter shown above the live map, top-right. The solid segment is the booked share,
 * the lighter track behind it is what is still available, so the fill reads as "how full is this event" at a glance.
 * It is a labelled progressbar for anyone not reading the colour.
 */
function ChartBookedProgress({ booked, total }: BookedProgress) {
  const safeTotal = Math.max(total, 0)
  const safeBooked = Math.min(Math.max(booked, 0), safeTotal)
  const available = safeTotal - safeBooked
  const percent = safeTotal > 0 ? Math.round((safeBooked / safeTotal) * 100) : 0

  return (
    <Box w={{ base: "300px", md: "360px" }} maxW="full">
      <Box
        role="progressbar"
        aria-valuenow={safeBooked}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuetext={`${safeBooked} booked, ${available} available`}
        h="12px"
        borderRadius="full"
        bg="brand.100"
        overflow="hidden"
      >
        <Box h="full" w={`${percent}%`} bg="brand.500" borderRadius="full" transition="width 0.3s ease" />
      </Box>
      <Text mt={1} fontSize="xs" fontWeight="700" color="gray.600" textAlign="right">
        {safeBooked} booked · {available} available
      </Text>
    </Box>
  )
}

interface EventChartPreviewProps {
  eventUniqueId: string
  progress?: BookedProgress
}

/**
 * A read-only render of the event's seat map, drawn from the same live data Seats.io shows: sold and held seats appear
 * unavailable, free seats in their category colour. It renders in `static` mode so it is a picture of the event, never
 * an editor — the organizer changes seats from the For sale tab, not here. Only the public workspace key reaches the
 * browser; the secret key stays on the server.
 */
export function EventChartPreview({ eventUniqueId, progress }: EventChartPreviewProps) {
  const query = useEventRenderContext(eventUniqueId, true)
  const [hasRenderFailed, setHasRenderFailed] = useState(false)

  if (query.isLoading) {
    return <Skeleton h={{ base: "220px", md: "300px" }} w="full" borderRadius="16px" />
  }

  const context = query.data
  const isAddressable = Boolean(context?.publicKey && context?.eventKey)

  if (query.isError || !isAddressable) {
    return <ChartPreviewUnavailable message="A live seat map is not available for this event yet." />
  }

  if (hasRenderFailed) {
    return <ChartPreviewUnavailable message="The seat map could not be drawn for this event." />
  }

  return (
    <Stack gap={2}>
      {progress ? (
        <Flex justify="flex-end">
          <ChartBookedProgress booked={progress.booked} total={progress.total} />
        </Flex>
      ) : null}
      <Box
        w="full"
        h={{ base: "260px", md: "340px", lg: "380px" }}
        borderRadius="16px"
        border="1px solid"
        borderColor="border.subtle"
        overflow="hidden"
        bg="white"
      >
        <SeatsioSeatingChart
          workspaceKey={context!.publicKey}
          event={context!.eventKey}
          region={resolveSeatsIoRegion(context!.region)}
          mode="static"
          onChartRenderingFailed={() => setHasRenderFailed(true)}
        />
      </Box>
    </Stack>
  )
}

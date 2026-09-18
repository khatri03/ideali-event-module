import { useState } from "react"
import { Badge, Box, Skeleton, Stack, Text } from "@chakra-ui/react"
import { SeatsioSeatingChart } from "@seatsio/seatsio-react"
import { useEventRenderContext } from "../hooks/useEventReports"

const SEATS_IO_REGIONS = ["eu", "na", "sa", "oc"] as const

type SeatsIoRegion = (typeof SEATS_IO_REGIONS)[number]

/** Narrows the region the API sent to one the renderer accepts, falling back to Europe when it is unrecognised. */
function resolveRegion(region: string): SeatsIoRegion {
  return SEATS_IO_REGIONS.includes(region as SeatsIoRegion) ? (region as SeatsIoRegion) : "eu"
}

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

interface EventChartPreviewProps {
  eventUniqueId: string
  bookedLabel?: string
}

/**
 * A read-only render of the event's seat map, drawn from the same live data Seats.io shows: sold and held seats appear
 * unavailable, free seats in their category colour. It renders in `static` mode so it is a picture of the event, never
 * an editor — the organizer changes seats from the For sale tab, not here. Only the public workspace key reaches the
 * browser; the secret key stays on the server.
 */
export function EventChartPreview({ eventUniqueId, bookedLabel }: EventChartPreviewProps) {
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
    <Box
      position="relative"
      w="full"
      h={{ base: "260px", md: "340px", lg: "380px" }}
      borderRadius="16px"
      border="1px solid"
      borderColor="border.subtle"
      overflow="hidden"
      bg="white"
    >
      {bookedLabel ? (
        <Badge
          position="absolute"
          top={3}
          right={3}
          zIndex={1}
          colorPalette="brand"
          variant="solid"
          borderRadius="full"
          px={3}
          py={1}
          fontWeight="700"
          boxShadow="sm"
        >
          {bookedLabel}
        </Badge>
      ) : null}
      <SeatsioSeatingChart
        workspaceKey={context!.publicKey}
        event={context!.eventKey}
        region={resolveRegion(context!.region)}
        mode="static"
        onChartRenderingFailed={() => setHasRenderFailed(true)}
      />
    </Box>
  )
}

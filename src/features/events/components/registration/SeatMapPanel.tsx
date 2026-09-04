import { Box, Skeleton, Stack, Text } from "@chakra-ui/react"
import { SeatsioSeatingChart } from "@seatsio/seatsio-react"
import type { EventSeatingMap } from "@/features/events/schemas/eventSeating.schemas"

/** Regions Seats.io serves charts from. Anything else means the workspace was configured with a region we cannot draw. */
const SEATS_IO_REGIONS = ["eu", "na", "sa", "oc"] as const

type SeatsIoRegion = (typeof SEATS_IO_REGIONS)[number]

/**
 * Narrows the region the API sent to one the renderer accepts.
 *
 * An unrecognised region is answered with the European host rather than passed through: the chart would otherwise
 * fail to load with nothing on screen to say why, and the buyer would be left staring at an empty box.
 */
function resolveRegion(region: string): SeatsIoRegion {
  return SEATS_IO_REGIONS.includes(region as SeatsIoRegion) ? (region as SeatsIoRegion) : "eu"
}

interface SeatMapPanelProps {
  /** The chart to draw, or null while it is still being read. */
  seatingMap: EventSeatingMap | null
  /** Whether a seat is being taken or given up right now, so the chart says so instead of looking idle. */
  isBusy: boolean
  /** Called with a seat label the buyer picked. */
  onSelectSeat: (objectLabel: string) => void
  /** Called with a seat label the buyer gave up. */
  onDeselectSeat: (objectLabel: string) => void
}

/**
 * The seating chart itself.
 *
 * Selection is reported upward rather than acted on here: the seat is taken by the server, which holds it with the
 * workspace secret key and refuses it when somebody else got there first. The chart is given the cart's hold token
 * so seats this buyer already holds show as theirs rather than as taken, and its own session handling is left off
 * for the same reason — two parties holding the same seats under one token is how a basket and a chart end up
 * disagreeing about what the buyer has.
 */
export function SeatMapPanel({ seatingMap, isBusy, onSelectSeat, onDeselectSeat }: SeatMapPanelProps) {
  if (!seatingMap) {
    return <Skeleton h={{ base: "420px", md: "560px" }} w="full" borderRadius="16px" />
  }

  return (
    <Stack gap={2} w="full">
      <Box
        w="full"
        h={{ base: "420px", md: "520px", lg: "560px" }}
        borderRadius="16px"
        borderWidth="1px"
        borderColor="gray.200"
        overflow="hidden"
        bg="white"
        opacity={isBusy ? 0.7 : 1}
        aria-busy={isBusy}
      >
        <SeatsioSeatingChart
          workspaceKey={seatingMap.seatsIoPublicKey}
          event={seatingMap.seatsIoEventKey}
          region={resolveRegion(seatingMap.region)}
          holdToken={seatingMap.holdToken}
          session="manual"
          pricing={seatingMap.categories.map((category) => ({
            category: category.categoryKey,
            price: category.price,
          }))}
          onObjectSelected={(object: { label: string }) => onSelectSeat(object.label)}
          onObjectDeselected={(object: { label: string }) => onDeselectSeat(object.label)}
        />
      </Box>
      <Text fontSize="xs" color="gray.600">
        Pick a seat on the map to add it to your order. Seats are held for you until your checkout time runs out.
      </Text>
    </Stack>
  )
}

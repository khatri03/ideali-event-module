import { useEffect, useRef, useState } from "react"
import { Box, Skeleton, Stack, Text } from "@chakra-ui/react"
import { SeatsioSeatingChart } from "@seatsio/seatsio-react"
import type { CategoryLimiter, SeatingChart } from "@seatsio/seatsio-types"
import type { EventSeatingCategory, EventSeatingMap } from "@/features/events/schemas/eventSeating.schemas"
import { UNAVAILABLE_SEAT_COLOR } from "@/features/events/utils/seatColors"
import { formatCurrencyCode } from "@/utils/format"

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

/**
 * What stands in for the chart when there is no chart to draw.
 *
 * Both cases end the same way for the buyer — no seats can be picked here — so both say so rather than leaving the
 * frame the chart would have filled empty, which reads as a session that is still loading and never arrives.
 */
function SeatMapUnavailable({ isPublished }: { isPublished: boolean }) {
  return (
    <Stack
      role="alert"
      gap={1}
      justify="center"
      h={{ base: "220px", md: "260px" }}
      px={{ base: 4, md: 6 }}
      w="full"
      borderRadius="16px"
      borderWidth="1px"
      borderColor="orange.200"
      bg="orange.50"
    >
      <Text fontSize="sm" fontWeight="700" color="orange.800">
        The seat map cannot be shown
      </Text>
      <Text fontSize="sm" color="orange.700">
        {isPublished
          ? "The seating plan failed to load. Please check your connection and try opening it again, or contact the organizer if it keeps happening."
          : "This session's seating plan has not been published yet. Please contact the organizer before booking a seat."}
      </Text>
    </Stack>
  )
}

/**
 * Turns each category's per-order maximum into a limit the chart enforces as the buyer picks.
 *
 * Categories the organizer left unlimited are left out rather than sent as a large number: an explicit limit the
 * chart cannot reach still shows up in its own refusal wording.
 */
function buildCategoryLimits(categories: EventSeatingCategory[]): CategoryLimiter[] {
  return categories
    .filter((category) => (category.maxPurchase ?? 0) > 0)
    .map((category) => ({ category: category.categoryKey, quantity: category.maxPurchase! }))
}

interface SeatMapPanelProps {
  /** The chart to draw, or null while it is still being read. */
  seatingMap: EventSeatingMap | null
  /** Whether a seat is being taken or given up right now, so the chart says so instead of looking idle. */
  isBusy: boolean
  /** Seats already picked on this session, so reopening the map shows them still chosen. */
  selectedSeatLabels: string[]
  /** Currency the chart prices its seats in, or null when the event has none set. */
  currencyCode: string | null
  /** Called with the label of a seat the buyer picked and the key of the category it is drawn in. */
  onSelectSeat: (objectLabel: string, categoryKey: string, objectType: string) => void
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
export function SeatMapPanel({
  seatingMap,
  isBusy,
  selectedSeatLabels,
  currencyCode,
  onSelectSeat,
  onDeselectSeat,
}: SeatMapPanelProps) {
  // The failure is remembered against the chart it belongs to rather than as a flag: a chart drawn for a different
  // event, or under a renewed hold token, is a different chart, and its predecessor's failure says nothing about it.
  const [failedChartKey, setFailedChartKey] = useState<string | null>(null)
  const chartKey = seatingMap ? `${seatingMap.seatsIoEventKey}:${seatingMap.holdToken}` : null
  const hasRenderFailed = chartKey !== null && failedChartKey === chartKey

  // The renderer tears the chart down and draws it again whenever any prop it was given differs, and a growing list
  // of picks differs on every pick. So the seats it starts with are frozen for as long as it keeps drawing the same
  // chart: a seat picked on the map is already coloured in by the map itself, and handing it back would make it
  // flash away under the buyer mid-pick.
  const [drawnSelection, setDrawnSelection] = useState({ chartKey, objectLabels: selectedSeatLabels })

  if (drawnSelection.chartKey !== chartKey) {
    setDrawnSelection({ chartKey, objectLabels: selectedSeatLabels })
  }

  const chartRef = useRef<SeatingChart | null>(null)
  const shownLabelsRef = useRef<string[]>(selectedSeatLabels)

  // A seat given up from the basket beside the map is the one change the chart cannot see for itself, and it is told
  // rather than redrawn: redrawing throws away a chart the buyer is still working on to change the colour of one
  // seat. Deselecting fires the chart's own deselect callback, which lands on a seat the selection has already let
  // go and is ignored there.
  useEffect(() => {
    const givenUp = shownLabelsRef.current.filter((objectLabel) => !selectedSeatLabels.includes(objectLabel))
    shownLabelsRef.current = selectedSeatLabels

    if (givenUp.length === 0 || !chartRef.current) {
      return
    }

    void chartRef.current.deselectObjects(givenUp)
  }, [selectedSeatLabels])

  if (!seatingMap) {
    return <Skeleton h={{ base: "420px", md: "560px" }} w="full" borderRadius="16px" />
  }

  const isChartAddressable = Boolean(seatingMap.seatsIoPublicKey && seatingMap.seatsIoEventKey)
  const isSeatHeldServerSide = Boolean(seatingMap.holdToken)

  if (!isChartAddressable || hasRenderFailed) {
    return <SeatMapUnavailable isPublished={isChartAddressable} />
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
          // Seats are picked whether or not a cart exists yet. Without one there is no session for the vendor to
          // keep, because the seats are held by our server against the cart, never by the chart against itself.
          mode="normal"
          holdToken={isSeatHeldServerSide ? seatingMap.holdToken : undefined}
          session={isSeatHeldServerSide ? "manual" : "none"}
          selectedObjects={drawnSelection.objectLabels.map((objectLabel) => ({ label: objectLabel }))}
          pricing={seatingMap.categories.map((category) => ({
            category: category.categoryKey,
            price: category.price,
          }))}
          // The chart prints prices of its own, in its own default format. Left alone it shows a bare number beside
          // seats the legend has already priced in the event's currency, and the two disagree on the same screen.
          priceFormatter={(price: number) => formatCurrencyCode(String(price), currencyCode)}
          // The one channel this colour has into the renderer's frame. Reaching for the constant from inside
          // objectColor instead throws there, and a throw inside the drawing loop takes the whole chart down.
          extraConfig={{ unavailableSeatColor: UNAVAILABLE_SEAT_COLOR }}
          // Seats that cannot be picked are drawn grey by default, close enough to the chart's own background that
          // a sold row reads as empty floor and buyers keep clicking it. The rule is written out here rather than
          // called from a helper because this runs inside the renderer's own frame, which reaches nothing in this
          // module. `isSelectable()` is the renderer's own verdict and covers every reason a buyer cannot take the
          // object - sold, held by somebody else, out of channel, or a section, which is never selectable to begin
          // with. It is missing from the published types but present on the object the renderer hands in, so an
          // object without it keeps its category colour rather than throwing inside the drawing loop.
          objectColor={(object, defaultColor, extraConfig) => {
            const isSelectable = (object as unknown as { isSelectable?: () => boolean }).isSelectable

            if (typeof isSelectable !== "function") {
              return defaultColor
            }

            return isSelectable.call(object) ? defaultColor : String(extraConfig.unavailableSeatColor)
          }}
          // The renderer hands back a far larger object; only the seat's own name and the category it is drawn in
          // decide anything here. Category keys arrive as numbers on charts whose categories were never named.
          onObjectSelected={(object) =>
            onSelectSeat(object.label, String(object.category?.key ?? ""), String(object.objectType ?? ""))
          }
          onObjectDeselected={(object) => onDeselectSeat(object.label)}
          // Held so a seat given up elsewhere can be deselected on the chart instead of redrawing it.
          onRenderStarted={(chart) => {
            chartRef.current = chart as SeatingChart
          }}
          // Category limits are the organizer's own per-order maximum. The chart refuses the seat before it is
          // picked, which is kinder than the server refusing it after; the server enforces it again regardless.
          maxSelectedObjects={buildCategoryLimits(seatingMap.categories)}
          onChartRendered={() => setFailedChartKey(null)}
          onChartRenderingFailed={() => setFailedChartKey(chartKey)}
        />
      </Box>
      <Text fontSize="xs" color="gray.600">
        {isSeatHeldServerSide
          ? "Pick a seat on the map to add it to your order. Seats are held for you until your checkout time runs out."
          : "Pick the seats you want. They are reserved in your name as soon as you give us your details on the next step."}
      </Text>
    </Stack>
  )
}

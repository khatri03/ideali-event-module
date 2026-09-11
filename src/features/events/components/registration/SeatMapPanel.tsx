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
 * The chart is the only party that holds and frees seats at Seats.io, under the buyer's own hold token: a click holds
 * the seat the instant it is made, which is what takes it out of every other buyer's chart in real time, and giving
 * it up frees it the same way. The server never holds or frees against the chart — it reads what the chart already
 * holds, records the claim behind its own unique index, and books the seats once the buyer has paid. One holder means
 * a release can never race a second one on the same seat, which is what a chart with its own session alongside a
 * server that also held would have done.
 *
 * A manual session is what lets the chart hold under a token we minted rather than one it keeps in browser storage,
 * so the chart cannot be drawn until that token exists — without it Seats.io refuses the session outright.
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
  const holdToken = seatingMap.holdToken

  if (!isChartAddressable || hasRenderFailed) {
    return <SeatMapUnavailable isPublished={isChartAddressable} />
  }

  // The manual session holds seats under this token, so the chart is not drawn until one has been issued. An empty
  // token here is the moment before the token call has answered, not a broken chart: showing the skeleton keeps the
  // buyer waiting rather than sending them to the organizer over a map that is about to appear.
  if (!holdToken) {
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
          // The chart holds every seat it draws under this token the instant the buyer clicks it, which is what takes
          // the seat out of every other buyer's chart in real time, and frees it the same way when it is given up. A
          // manual session is what carries the token we minted, so the chart never mints or stores one of its own. The
          // server reads what this token already holds rather than holding again, so there is only ever one holder and
          // no release to race. Seats already held for this buyer are handed back through `selectedObjects`.
          mode="normal"
          session="manual"
          holdToken={holdToken}
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
        Pick a seat on the map to add it to your order. Seats are held for you the moment you pick them, until your
        checkout time runs out.
      </Text>
    </Stack>
  )
}

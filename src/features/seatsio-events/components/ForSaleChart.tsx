import { useState } from "react"
import { Box, Flex, HStack, Skeleton, Stack, Text } from "@chakra-ui/react"
import { MinusCircle, MousePointerClick } from "lucide-react"
import { SeatsioSeatingChart } from "@seatsio/seatsio-react"
import type { SeatingChart, SelectableObject } from "@seatsio/seatsio-react"
import { useEventRenderContext } from "../hooks/useEventReports"
import { resolveSeatsIoRegion } from "../utils/resolveSeatsIoRegion"
import { StagedApplyBar } from "./StagedApplyBar"

interface ForSaleChartProps {
  eventUniqueId: string
  /** Labels currently staged to go off sale, rendered as the map's selection readout. */
  stagedLabels: string[]
  /** An on-sale object was picked on the map; its label is staged to be taken off sale. */
  onObjectStaged: (label: string) => void
  /** A previously picked object was released; its label is dropped from the staged set. */
  onObjectUnstaged: (label: string) => void
  /** Hands the live chart up so the panel can clear the map selection once a change is applied. */
  onChartReady: (chart: SeatingChart | null) => void
  /** Commits the staged take-off-sale set; resolves true on success so its confirm dialog can close. */
  onApply: () => Promise<boolean>
  /** Drops the staged take-off-sale set and the map selection without sending anything. */
  onClear: () => void
  /** The take-off-sale commit is in flight. */
  isApplying: boolean
}

/**
 * Maroon the map paints held-back objects in. The objectColor callback below runs inside the Seats.io iframe and
 * can't read this constant, so the same hex is hard-coded there — keep the two in sync.
 */
const NOT_FOR_SALE_COLOR = "#A63A3A"

/** A section has no per-object for-sale flag; only bookable objects (seats, tables, areas) carry one. */
function isForSale(object: SelectableObject): boolean {
  return "forSale" in object ? object.forSale : true
}

function ChartUnavailable({ message }: { message: string }) {
  return (
    <Stack
      role="status"
      justify="center"
      align="center"
      textAlign="center"
      gap={2}
      h={{ base: "260px", md: "340px" }}
      px={{ base: 4, md: 6 }}
    >
      <Box color="text.secondary">
        <MousePointerClick size={26} />
      </Box>
      <Text fontSize="sm" fontWeight="600" color="text.secondary" maxW="sm">
        {message}
      </Text>
    </Stack>
  )
}

/**
 * The live, selectable seat map the organizer uses to stage objects for going off sale. It renders with the public
 * workspace key only, so the secret key never reaches the browser; because a public-key renderer can select only
 * objects that are currently on sale, this map stages the "not for sale" direction alone. Putting objects back on sale
 * is staged from the held-back card below it. Nothing is sent until the organizer applies the pending changes.
 */
export function ForSaleChart({
  eventUniqueId,
  stagedLabels,
  onObjectStaged,
  onObjectUnstaged,
  onChartReady,
  onApply,
  onClear,
  isApplying,
}: ForSaleChartProps) {
  const query = useEventRenderContext(eventUniqueId, true)
  const [hasRenderFailed, setHasRenderFailed] = useState(false)

  const context = query.data
  const isAddressable = Boolean(context?.publicKey && context?.eventKey)
  const stagedCount = stagedLabels.length

  return (
    <Box
      borderRadius="16px"
      border="1px solid"
      borderColor="border.subtle"
      overflow="hidden"
      bg="card.bg"
      boxShadow="card"
    >
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        px={{ base: 4, md: 5 }}
        py={{ base: 3, md: 4 }}
        borderBottom="1px solid"
        borderColor="border.subtle"
      >
        <HStack gap={3} minW={0}>
          <Box color="status.warning.fg">
            <MinusCircle size={20} />
          </Box>
          <Box minW={0}>
            <Text fontSize="sm" fontWeight="800" color="text.primary">
              Take objects off sale
            </Text>
            <Text fontSize="xs" color="text.secondary">
              Pick on-sale objects on the map to stage them.
            </Text>
          </Box>
        </HStack>
        {isAddressable && !hasRenderFailed ? (
          <HStack gap={2} flexShrink={0}>
            <Box w="10px" h="10px" borderRadius="full" bg={NOT_FOR_SALE_COLOR} />
            <Text fontSize="xs" fontWeight="600" color="text.secondary" whiteSpace="nowrap">
              Not for sale
            </Text>
          </HStack>
        ) : null}
      </Flex>

      <Box h={{ base: "260px", md: "340px", lg: "380px" }}>
        {query.isLoading ? (
          <Skeleton h="full" w="full" />
        ) : query.isError || !isAddressable ? (
          <ChartUnavailable message="A live seat map is not available for this event yet." />
        ) : hasRenderFailed ? (
          <ChartUnavailable message="The seat map could not be drawn for this event." />
        ) : (
          <SeatsioSeatingChart
            workspaceKey={context!.publicKey}
            event={context!.eventKey}
            region={resolveSeatsIoRegion(context!.region)}
            mode="normal"
            objectPopover={{ showAvailability: true, showLabel: true, showCategory: true }}
            objectColor={(object: SelectableObject, defaultColor: string) =>
              "forSale" in object && !object.forSale ? "#A63A3A" : defaultColor
            }
            popoverInfo={(object: SelectableObject) =>
              "forSale" in object && !object.forSale ? "Not for sale" : ""
            }
            onRenderStarted={(chart) => onChartReady(chart as SeatingChart)}
            onObjectSelected={(object) => {
              if (isForSale(object)) {
                onObjectStaged(object.label)
              }
            }}
            onObjectDeselected={(object) => onObjectUnstaged(object.label)}
            onChartRenderingFailed={() => setHasRenderFailed(true)}
          />
        )}
      </Box>

      {stagedCount > 0 ? (
        <StagedApplyBar
          tone="warning"
          summary={`${stagedCount} on-sale ${stagedCount === 1 ? "object" : "objects"} staged to go off sale`}
          labels={stagedLabels}
          applyLabel={`Take ${stagedCount} off sale`}
          confirmTitle={`Take ${stagedCount} ${stagedCount === 1 ? "object" : "objects"} off sale`}
          confirmTone="destructive"
          outcomeText="Buyers will no longer be able to buy these objects."
          onApply={onApply}
          onClear={onClear}
          isApplying={isApplying}
        />
      ) : (
        <Box px={{ base: 4, md: 5 }} py={{ base: 3, md: 4 }} borderTop="1px solid" borderColor="border.subtle">
          <Text fontSize="sm" fontWeight="700" color="text.secondary">
            Off-sale objects show as ✕ on the map and can't be picked here.
          </Text>
        </Box>
      )}
    </Box>
  )
}

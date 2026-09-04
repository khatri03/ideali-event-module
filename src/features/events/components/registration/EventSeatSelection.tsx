import { useState } from "react"
import { SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { SeatMapPanel } from "@/features/events/components/registration/SeatMapPanel"
import { SelectedSeatsPanel } from "@/features/events/components/registration/SelectedSeatsPanel"
import { useEventSeating } from "@/features/events/hooks/useEventSeating"
import type { EventCart } from "@/features/events/schemas/eventCart.schemas"
import { extractApiError } from "@/utils/errors"

interface EventSeatSelectionProps {
  /** Cart the seats are held for, or null before the buyer has opened one. */
  cartUniqueId: string | null
  /** Session whose chart is being drawn. */
  sessionUniqueId: string
  /** Currency the seat prices are shown in, or null when the event has none set. */
  currencyCode: string | null
  /** Called with the basket after a seat was taken or given up. */
  onCartChanged: (cart: EventCart) => void
}

/**
 * Seat selection for one session: the chart, the seats the buyer is holding, and whatever went wrong last.
 *
 * Every refusal is shown in the buyer's own words rather than logged and swallowed — losing a seat to somebody else
 * is the ordinary outcome of a busy sale, and a buyer who is not told simply clicks the same seat again.
 */
export function EventSeatSelection({
  cartUniqueId,
  sessionUniqueId,
  currencyCode,
  onCartChanged,
}: EventSeatSelectionProps) {
  const [refusal, setRefusal] = useState("")

  const { seatingMap, isLoading, isError, error, isSeatChanging, holdSeat, releaseSeat } = useEventSeating({
    cartUniqueId,
    sessionUniqueId,
    onCartChanged: (cart) => {
      setRefusal("")
      onCartChanged(cart)
    },
    onSeatRefused: setRefusal,
  })

  if (!cartUniqueId) {
    return (
      <Stack gap={1} px={4} py={5} borderRadius="16px" borderWidth="1px" borderColor="gray.200" bg="gray.50">
        <Text fontSize="sm" fontWeight="700" color="gray.800">
          Tell us who you are to start picking seats
        </Text>
        <Text fontSize="sm" color="gray.600">
          A seat is held in your name the moment you pick it, so we need your name and email address first.
        </Text>
      </Stack>
    )
  }

  if (isError) {
    return (
      <Stack gap={1} px={4} py={5} borderRadius="16px" borderWidth="1px" borderColor="red.200" bg="red.50">
        <Text fontSize="sm" fontWeight="700" color="red.700">
          The seat map could not be loaded
        </Text>
        <Text fontSize="sm" color="red.700">
          {extractApiError(error)}
        </Text>
      </Stack>
    )
  }

  return (
    <Stack gap={3} w="full">
      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={4} w="full">
        <Stack gridColumn={{ lg: "span 2" }} gap={3}>
          <SeatMapPanel
            seatingMap={isLoading ? null : seatingMap}
            isBusy={isSeatChanging}
            onSelectSeat={holdSeat}
            onDeselectSeat={releaseSeat}
          />
        </Stack>
        <SelectedSeatsPanel
          seats={seatingMap?.selectedSeats ?? []}
          currencyCode={currencyCode}
          isBusy={isSeatChanging}
          onReleaseSeat={releaseSeat}
        />
      </SimpleGrid>
      {refusal ? (
        <Text role="alert" fontSize="sm" color="red.600">
          {refusal}
        </Text>
      ) : null}
    </Stack>
  )
}

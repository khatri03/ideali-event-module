import { useEffect, useRef, useState } from "react"
import { SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { SeatCategoryLegend } from "@/features/events/components/registration/SeatCategoryLegend"
import { SeatMapPanel } from "@/features/events/components/registration/SeatMapPanel"
import { SeatPickerCta } from "@/features/events/components/registration/SeatPickerCta"
import { SeatPickerDialog } from "@/features/events/components/registration/SeatPickerDialog"
import { SelectedSeatsPanel } from "@/features/events/components/registration/SelectedSeatsPanel"
import { useEventSeating } from "@/features/events/hooks/useEventSeating"
import type { SeatPick } from "@/features/events/hooks/useSeatSelection"
import type { EventSeatingCategory } from "@/features/events/schemas/eventSeating.schemas"
import { extractApiError } from "@/utils/errors"

interface EventSeatSelectionProps {
  /** Event the session belongs to, which is how the chart is read before a cart exists. */
  eventUniqueId: string
  /** Cart the seats are held for, or null before the buyer has opened one. */
  cartUniqueId: string | null
  /** Session whose chart is being drawn. */
  sessionUniqueId: string
  /** Session name, shown on the seat map so the buyer can tell which one they opened. */
  sessionName: string
  /** Seats already picked on this session. */
  seats: SeatPick[]
  /** Why the last seat could not be taken or given up, or null when nothing went wrong. */
  refusal: string | null
  /** Whether a seat is being taken or given up right now. */
  isSeatChanging: boolean
  /** Currency the seat prices are shown in, or null when the event has none set. */
  currencyCode: string | null
  /** The organizer's form colour, worn by the button that opens the map. */
  accentColor: string
  /** Token this browser holds seats under while there is no cart, or null before one has been issued. */
  holdToken: string | null
  /** Issues that token, so the chart the buyer just opened can hold what they pick on it. */
  onEnsureHoldToken: () => Promise<string | null>
  /** Called with a seat the buyer picked, priced from the chart's own categories. */
  onPickSeat: (pick: SeatPick) => void
  /** Called with every seat label the buyer gave up, which is one seat or a whole table's worth of them. */
  onUnpickSeats: (objectLabels: string[]) => void
  /** Called with the seats the server says the cart already holds on this session. */
  onAdoptHeldSeats: (seats: SeatPick[]) => void
}

/** Says why there is no chart, rather than leaving the frame it would have filled empty. */
function SeatMapNotice({ title, detail, tone }: { title: string; detail: string; tone: "neutral" | "error" }) {
  const isError = tone === "error"

  return (
    <Stack
      role={isError ? "alert" : undefined}
      gap={1}
      px={4}
      py={5}
      borderRadius="16px"
      borderWidth="1px"
      borderColor={isError ? "red.200" : "gray.200"}
      bg={isError ? "red.50" : "gray.50"}
    >
      <Text fontSize="sm" fontWeight="700" color={isError ? "red.700" : "gray.800"}>
        {title}
      </Text>
      <Text fontSize="sm" color={isError ? "red.700" : "gray.600"}>
        {detail}
      </Text>
    </Stack>
  )
}

/**
 * Seat selection for one session: the button that opens the chart, the seats the buyer has picked, and whatever
 * went wrong last.
 *
 * The chart lives behind the button rather than on the card because it is the heaviest thing on the form and every
 * seated session would otherwise draw its own, inside a tab body that is already a scroll box. The seats picked
 * stay listed on the card, so closing the map hides nothing the buyer is paying for and a seat can be given up
 * without opening it again.
 *
 * What a seat costs is read off the chart's own categories rather than sent up as a bare label: the picked seat has
 * to name a ticket type for the order summary and the attendee slots to account for it, and the categories are the
 * only place that mapping exists on this side.
 */
export function EventSeatSelection({
  eventUniqueId,
  cartUniqueId,
  sessionUniqueId,
  sessionName,
  seats,
  refusal,
  isSeatChanging,
  currencyCode,
  accentColor,
  holdToken,
  onEnsureHoldToken,
  onPickSeat,
  onUnpickSeats,
  onAdoptHeldSeats,
}: EventSeatSelectionProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const { seatingMap, isFetching, isError, error, refreshSeating } = useEventSeating({
    eventUniqueId,
    cartUniqueId,
    sessionUniqueId,
  })

  // The handler is called through a ref so that adopting depends on the map alone. Its caller passes a new function
  // on every render, and a seat given up from the basket would otherwise be adopted straight back off a map that
  // still lists it - the buyer presses remove and watches the seat reappear.
  const adoptHeldSeatsRef = useRef(onAdoptHeldSeats)

  useEffect(() => {
    adoptHeldSeatsRef.current = onAdoptHeldSeats
  })

  // A cart that survived a refresh brings its seats back on the map rather than in anything this browser kept, so
  // the selection is told about them wherever they come from.
  useEffect(() => {
    if (!seatingMap || seatingMap.selectedSeats.length === 0) {
      return
    }

    adoptHeldSeatsRef.current(
      seatingMap.selectedSeats.map((seat) => ({
        sessionUniqueId,
        objectLabel: seat.objectLabel,
        ticketTypeUniqueId: seat.ticketTypeUniqueId,
        ticketTypeName: seat.ticketTypeName,
        price: seat.price,
      })),
    )
  }, [seatingMap, sessionUniqueId])

  const handleOpen = () => {
    setIsPickerOpen(true)

    if (cartUniqueId) {
      void refreshSeating()
      return
    }

    void onEnsureHoldToken()
  }

  // The chart read before a cart exists carries no token of its own, so the browser's is put on it. Without one the
  // map would draw and let the buyer pick seats that nothing anywhere is holding for them.
  const pickableSeatingMap =
    seatingMap && !seatingMap.holdToken && holdToken ? { ...seatingMap, holdToken } : seatingMap

  const handleSelectSeat = (objectLabel: string, categoryKey: string) => {
    const category = findCategory(seatingMap?.categories ?? [], categoryKey)

    // A seat whose category is not on sale in this session has no ticket type behind it, so there is nothing to
    // charge for it. Ignoring the pick leaves the chart's own refusal to explain itself.
    if (!category) {
      return
    }

    onPickSeat({
      sessionUniqueId,
      objectLabel,
      ticketTypeUniqueId: category.ticketTypeUniqueId,
      ticketTypeName: category.ticketTypeName,
      price: category.price,
    })
  }

  return (
    <Stack gap={3} w="full">
      <SeatPickerCta seatCount={seats.length} accentColor={accentColor} onOpen={handleOpen} />

      {seats.length > 0 ? (
        <SelectedSeatsPanel
          sessionName={sessionName}
          seats={seats}
          currencyCode={currencyCode}
          isBusy={isSeatChanging}
          onReleaseSeats={onUnpickSeats}
        />
      ) : null}

      {/* The same refusal is never shown twice: it belongs wherever the buyer is looking. */}
      {refusal && !isPickerOpen ? (
        <Text role="alert" fontSize="sm" color="red.600">
          {refusal}
        </Text>
      ) : null}

      <SeatPickerDialog
        isOpen={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        sessionName={sessionName}
        accentColor={accentColor}
      >
        {isError ? (
          <SeatMapNotice tone="error" title="The seat map could not be loaded" detail={extractApiError(error)} />
        ) : (
          <Stack gap={3} w="full">
            {seatingMap && seatingMap.categories.length > 0 ? (
              <SeatCategoryLegend categories={seatingMap.categories} currencyCode={currencyCode} />
            ) : null}
            <SimpleGrid columns={{ base: 1, lg: 3 }} gap={4} w="full">
              <Stack gridColumn={{ lg: "span 2" }} gap={3}>
                <SeatMapPanel
                  seatingMap={isFetching ? null : pickableSeatingMap}
                  isBusy={isSeatChanging}
                  selectedSeatLabels={seats.map((seat) => seat.objectLabel)}
                  currencyCode={currencyCode}
                  onSelectSeat={handleSelectSeat}
                  onDeselectSeat={(objectLabel) => onUnpickSeats([objectLabel])}
                />
              </Stack>
              <SelectedSeatsPanel
                sessionName={sessionName}
                seats={seats}
                currencyCode={currencyCode}
                isBusy={isSeatChanging}
                onReleaseSeats={onUnpickSeats}
              />
            </SimpleGrid>
            {refusal ? (
              <Text role="alert" fontSize="sm" color="red.600">
                {refusal}
              </Text>
            ) : null}
          </Stack>
        )}
      </SeatPickerDialog>
    </Stack>
  )
}

/** Finds the ticket type a chart category is sold as, which is what prices the seat drawn in it. */
function findCategory(categories: EventSeatingCategory[], categoryKey: string): EventSeatingCategory | undefined {
  return categories.find((category) => category.categoryKey === categoryKey)
}

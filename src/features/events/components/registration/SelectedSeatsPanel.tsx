import { useState } from "react"
import { Badge, Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { Trash2, X } from "lucide-react"
import { ConfirmRemoveDialog } from "@/features/events/components/registration/RegistrationDialogs"
import {
  describeSeat,
  groupSeatsByParent,
  type BasketSeat,
  type SeatGroup,
} from "@/features/events/utils/seatGrouping"
import { formatCurrencyCode } from "@/utils/format"

interface SelectedSeatsPanelProps {
  /** Session the seats belong to, which heads the list and names what a whole-session removal gives up. */
  sessionName: string
  /** Seats this cart is holding on the open session. */
  seats: BasketSeat[]
  /** Currency the prices are shown in, or null when the event has none set. */
  currencyCode: string | null
  /**
   * The colour each ticket type's seats are drawn in on the chart, keyed by ticket type. A ticket type the chart
   * gave no colour for is left out, and its seats are listed without one rather than under a colour that matches
   * nothing on the map.
   */
  seatColorByTicketType: Record<string, string>
  /** Whether a seat is being taken or given up, so the buttons cannot fire twice. */
  isBusy: boolean
  /** Called with every seat label the buyer confirmed giving up, which is one label or a whole table's worth. */
  onReleaseSeats: (objectLabels: string[]) => void
}

/** What the buyer is about to give up, held until they confirm it. */
interface PendingRemoval {
  title: string
  description: string
  objectLabels: string[]
}

/** Reads as "8 seats, $1,200.00", so a heading says how much sits under it and what dropping it gives up. */
function describeSeatTotal(seatCount: number, totalPrice: number, currencyCode: string | null): string {
  const seats = seatCount === 1 ? "1 seat" : `${seatCount} seats`

  return `${seats}, ${formatCurrencyCode(totalPrice.toFixed(2), currencyCode)}`
}

/**
 * Reads what every seat under a heading is sold as, or nothing when they are not all sold alike.
 *
 * What a seat costs belongs to the category it is drawn in, not to the seat, so a table of nine identical seats has
 * one ticket type and one price between them. Printing both on all nine put eighteen copies of one sentence between
 * the buyer and the seat numbers they came to check. Said once on the heading it stays available and stops
 * competing; a table sold as a mixture has no single answer, so each seat names its own category instead.
 */
function readSharedTicketType(group: SeatGroup): { name: string; price: number; ticketTypeUniqueId: string } | null {
  const [first, ...rest] = group.entries

  if (!first) {
    return null
  }

  const isShared = rest.every(
    (entry) => entry.seat.ticketTypeName === first.seat.ticketTypeName && entry.seat.price === first.seat.price,
  )

  return isShared
    ? {
        name: first.seat.ticketTypeName,
        price: first.seat.price,
        ticketTypeUniqueId: first.seat.ticketTypeUniqueId,
      }
    : null
}

/**
 * The dot that ties a line in the basket to a colour on the seat map.
 *
 * The colour repeats what the ticket type beside it already says, so it carries no meaning of its own: a buyer who
 * cannot tell two categories apart by colour reads the same basket. Nothing is drawn for a ticket type the chart
 * gave no colour for, which is truer than a grey dot the map has no counterpart for.
 */
function SeatColorDot({ color }: { color: string | undefined }) {
  if (!color) {
    return null
  }

  return (
    <Box
      aria-hidden
      flexShrink={0}
      w="10px"
      h="10px"
      borderRadius="full"
      borderWidth="1px"
      borderColor="blackAlpha.300"
      bg={color}
    />
  )
}

/** The trash control every heading and every seat row carries, sized to stay pressable on a phone. */
function RemoveButton({ label, isBusy, onRemove }: { label: string; isBusy: boolean; onRemove: () => void }) {
  return (
    <Button
      aria-label={label}
      variant="ghost"
      colorPalette="red"
      color="red.500"
      minW="11"
      h="11"
      px={0}
      borderRadius="12px"
      cursor={isBusy ? "not-allowed" : "pointer"}
      aria-disabled={isBusy}
      _hover={{ bg: "red.50" }}
      onClick={() => {
        if (isBusy) {
          return
        }

        onRemove()
      }}
    >
      <Trash2 size={16} aria-hidden />
    </Button>
  )
}

/**
 * The seats the buyer is holding, gathered into the tables and rows they sit at.
 *
 * A count would not do: the buyer chose specific seats and has to be able to check that the ones on the basket are
 * the ones on the map. Eight seats at one table are listed under that table rather than as eight unrelated lines,
 * because that is how the buyer picked them and how they will want to drop them - a party that shrank gives up a
 * table, not nine seats one at a time.
 *
 * Each heading wears the colour its seats are drawn in on the chart, so the buyer reads what they have already
 * taken of each category without matching seat numbers back to the map by hand. A group sold as a mixture has no
 * single colour to wear, so its seats carry their own instead.
 *
 * Every removal is confirmed and every confirmation names what is going, since a seat handed back goes on sale
 * again immediately and the buyer may not get it a second time.
 */
export function SelectedSeatsPanel({
  sessionName,
  seats,
  currencyCode,
  seatColorByTicketType,
  isBusy,
  onReleaseSeats,
}: SelectedSeatsPanelProps) {
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null)

  if (seats.length === 0) {
    return (
      <Stack gap={1} px={4} py={5} borderRadius="16px" borderWidth="1px" borderColor="gray.200" bg="gray.50">
        <Text fontSize="sm" fontWeight="600" color="gray.800">
          No seats chosen yet
        </Text>
        <Text fontSize="sm" color="gray.600">
          Pick a seat on the map and it will appear here with its price.
        </Text>
      </Stack>
    )
  }

  const groups = groupSeatsByParent(seats)
  const sessionTotal = seats.reduce((total, seat) => total + seat.price, 0)

  const confirmRemoval = () => {
    if (!pendingRemoval) {
      return
    }

    onReleaseSeats(pendingRemoval.objectLabels)
    setPendingRemoval(null)
  }

  return (
    <Stack gap={3} w="full">
      <Flex align="center" justify="space-between" gap={3} wrap="wrap">
        <Stack gap={0} minW={0}>
          <Text fontSize="sm" fontWeight="700" color="gray.800" truncate>
            {sessionName}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {describeSeatTotal(seats.length, sessionTotal, currencyCode)}
          </Text>
        </Stack>
        {seats.length > 1 ? (
          <RemoveButton
            label={`Remove all seats for ${sessionName}`}
            isBusy={isBusy}
            onRemove={() =>
              setPendingRemoval({
                title: `Remove all seats for ${sessionName}?`,
                description: `All ${seats.length} seats you picked for this session, worth ${formatCurrencyCode(sessionTotal.toFixed(2), currencyCode)}, go back on sale and someone else can take them.`,
                objectLabels: seats.map((seat) => seat.objectLabel),
              })
            }
          />
        ) : null}
      </Flex>

      {groups.map((group) => {
        const sharedTicketType = readSharedTicketType(group)
        const sharedSeatColor = sharedTicketType
          ? seatColorByTicketType[sharedTicketType.ticketTypeUniqueId]
          : undefined

        return (
          <Stack
            key={group.key}
            gap={3}
            px={3}
            py={3}
            borderRadius="16px"
            borderWidth="1px"
            borderColor="gray.200"
            borderLeftWidth={sharedSeatColor ? "4px" : undefined}
            borderLeftColor={sharedSeatColor}
            bg="gray.50"
          >
            <Flex align="center" justify="space-between" gap={3} wrap="wrap">
              <Stack gap={1} minW={0}>
                <Flex align="center" gap={2} wrap="wrap">
                  <Text fontSize="sm" fontWeight="700" color="gray.900" truncate>
                    {group.name}
                  </Text>
                  {sharedTicketType ? (
                    <Badge colorPalette="gray" fontSize="xs" gap={1.5}>
                      <SeatColorDot color={sharedSeatColor} />
                      {sharedTicketType.name}
                    </Badge>
                  ) : null}
                </Flex>
                <Text fontSize="xs" color="gray.600">
                  {sharedTicketType
                    ? `${describeSeatTotal(group.entries.length, group.totalPrice, currencyCode)} (${formatCurrencyCode(sharedTicketType.price.toFixed(2), currencyCode)} each)`
                    : describeSeatTotal(group.entries.length, group.totalPrice, currencyCode)}
                </Text>
              </Stack>
              {group.entries.length > 1 ? (
                <RemoveButton
                  label={`Remove ${group.name}`}
                  isBusy={isBusy}
                  onRemove={() =>
                    setPendingRemoval({
                      title: `Remove ${group.name}?`,
                      description: `All ${group.entries.length} seats you picked at ${group.name}, worth ${formatCurrencyCode(group.totalPrice.toFixed(2), currencyCode)}, go back on sale and someone else can take them.`,
                      objectLabels: group.entries.map((entry) => entry.seat.objectLabel),
                    })
                  }
                />
              ) : null}
            </Flex>

            <Flex gap={2} wrap="wrap">
              {group.entries.map((entry) => (
                <Button
                  key={entry.seat.objectLabel}
                  aria-label={`Remove ${describeSeat(entry.seat.objectLabel)}`}
                  aria-disabled={isBusy}
                  variant="outline"
                  h="11"
                  px={3}
                  borderRadius="full"
                  borderColor="gray.200"
                  bg="white"
                  color="gray.900"
                  fontWeight="700"
                  fontSize="sm"
                  cursor={isBusy ? "not-allowed" : "pointer"}
                  _hover={{ borderColor: "red.300", color: "red.600", bg: "red.50" }}
                  onClick={() => {
                    if (isBusy) {
                      return
                    }

                    setPendingRemoval({
                      title: `Remove ${describeSeat(entry.seat.objectLabel)}?`,
                      description:
                        "This seat goes back on sale and someone else can take it. You can pick it again while it is still free.",
                      objectLabels: [entry.seat.objectLabel],
                    })
                  }}
                >
                  <Text>{entry.name}</Text>
                  {sharedTicketType ? null : (
                    <>
                      <SeatColorDot color={seatColorByTicketType[entry.seat.ticketTypeUniqueId]} />
                      <Text fontWeight="500" fontSize="xs" color="gray.600">
                        {entry.seat.ticketTypeName}
                      </Text>
                    </>
                  )}
                  <X size={14} aria-hidden />
                </Button>
              ))}
            </Flex>
          </Stack>
        )
      })}

      <ConfirmRemoveDialog
        isOpen={pendingRemoval !== null}
        title={pendingRemoval?.title}
        description={pendingRemoval?.description}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={confirmRemoval}
      />
    </Stack>
  )
}

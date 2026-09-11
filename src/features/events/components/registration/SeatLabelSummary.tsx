import { useState } from "react"
import { Badge, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { Trash2 } from "lucide-react"
import { ConfirmRemoveDialog } from "@/features/events/components/registration/RegistrationDialogs"
import { describeSeat, groupSeatLabels, type SeatIdentity } from "@/features/events/utils/seatGrouping"

interface SeatLabelSummaryProps {
  /** Objects the line is holding, as the plan draws them, e.g. "18-2" or "8". */
  seats: SeatIdentity[]
  /** Whether to frame the list, which suits a card but not a table cell that already has its own borders. */
  isFramed?: boolean
  /**
   * Called with the label of a seat the buyer confirmed giving up. When given, each seat turns into a control that
   * hands that one seat back; when left out the list stays read-only, as it is on the payment review.
   */
  onRemoveSeat?: (objectLabel: string) => void
  /** Whether a seat is being taken or given up right now, so a second removal cannot fire over the first. */
  isBusy?: boolean
  /** The organizer's form colour, worn by each seat's remove icon so it reads as part of this event's theme. */
  accentColor?: string
}

/** What the buyer is about to give up, held until they confirm it. */
interface PendingRemoval {
  objectLabel: string
  title: string
}

const REMOVE_SEAT_DESCRIPTION =
  "This seat goes back on sale and someone else can take it. You can pick it again while it is still free."

/**
 * The seats behind one seated line, listed under the table or row they sit at.
 *
 * A seated line has no quantity to set: the seats were chosen on the plan and the count follows from them. Naming
 * them is what lets the buyer check a summary against the map before paying, and listing them under their table is
 * how they picked them — "Table 18: Seat 2" answers a question "3 seats" does not.
 *
 * Given `onRemoveSeat`, every seat becomes a control the buyer can hand back one at a time, each confirmed by name
 * so a seat never goes back on sale on a stray press. Without it the list is read-only.
 *
 * An empty list says where seats come from rather than showing an empty frame, because a seated line can be in the
 * cart for a moment before the seats it is holding have been read back.
 */
export function SeatLabelSummary({
  seats,
  isFramed = true,
  onRemoveSeat,
  isBusy = false,
  accentColor,
}: SeatLabelSummaryProps) {
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null)

  if (seats.length === 0) {
    return (
      <Text fontSize="xs" color="gray.500" lineHeight="1.5">
        Pick seats on the seat map in Sessions and they appear here.
      </Text>
    )
  }

  const confirmRemoval = () => {
    if (!pendingRemoval) {
      return
    }

    onRemoveSeat?.(pendingRemoval.objectLabel)
    setPendingRemoval(null)
  }

  return (
    <Stack
      gap={2}
      borderWidth={isFramed ? "1px" : undefined}
      borderColor={isFramed ? "gray.200" : undefined}
      borderRadius={isFramed ? "16px" : undefined}
      bg={isFramed ? "gray.50" : undefined}
      px={isFramed ? 3 : 0}
      py={isFramed ? 2.5 : 0}
    >
      {groupSeatLabels(seats).map((group) => (
        <Stack key={group.key} gap={1}>
          {group.parentName ? (
            <Text fontSize="xs" fontWeight="700" color="gray.600">
              {group.parentName}
            </Text>
          ) : null}
          <Flex gap={1.5} wrap="wrap">
            {group.seats.map((entry) =>
              onRemoveSeat ? (
                <Button
                  key={entry.identity.objectLabel}
                  aria-label={`Remove ${describeSeat(entry.identity)}`}
                  aria-disabled={isBusy}
                  variant="outline"
                  h="11"
                  px={3}
                  gap={1.5}
                  borderRadius="full"
                  borderColor="gray.200"
                  bg="white"
                  color="gray.800"
                  fontSize="xs"
                  fontWeight="700"
                  cursor={isBusy ? "not-allowed" : "pointer"}
                  _hover={{ borderColor: "red.300", color: "red.600", bg: "red.50" }}
                  onClick={() => {
                    if (isBusy) {
                      return
                    }

                    setPendingRemoval({
                      objectLabel: entry.identity.objectLabel,
                      title: `Remove ${describeSeat(entry.identity)}?`,
                    })
                  }}
                >
                  <Text as="span">{entry.name}</Text>
                  <Trash2 size={11} color={accentColor} aria-hidden />
                </Button>
              ) : (
                <Badge
                  key={entry.identity.objectLabel}
                  colorPalette="gray"
                  variant="subtle"
                  borderRadius="full"
                  px={2.5}
                  py={1}
                  fontSize="xs"
                  fontWeight="700"
                  color="gray.800"
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  {entry.name}
                </Badge>
              ),
            )}
          </Flex>
        </Stack>
      ))}

      {onRemoveSeat ? (
        <ConfirmRemoveDialog
          isOpen={pendingRemoval !== null}
          title={pendingRemoval?.title}
          description={REMOVE_SEAT_DESCRIPTION}
          onCancel={() => setPendingRemoval(null)}
          onConfirm={confirmRemoval}
        />
      ) : null}
    </Stack>
  )
}

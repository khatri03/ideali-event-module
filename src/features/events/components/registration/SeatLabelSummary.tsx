import { Badge, Flex, Stack, Text } from "@chakra-ui/react"
import { groupSeatLabels } from "@/features/events/utils/seatGrouping"

interface SeatLabelSummaryProps {
  /** Seat labels the line is holding, as the plan draws them, e.g. "18-2". */
  seatLabels: string[]
  /** Whether to frame the list, which suits a card but not a table cell that already has its own borders. */
  isFramed?: boolean
}

/**
 * The seats behind one seated line, listed under the table or row they sit at.
 *
 * A seated line has no quantity to set: the seats were chosen on the plan and the count follows from them. Naming
 * them is what lets the buyer check a summary against the map before paying, and listing them under their table is
 * how they picked them — "Table 18: Seat 2" answers a question "3 seats" does not.
 *
 * An empty list says where seats come from rather than showing an empty frame, because a seated line can be in the
 * cart for a moment before the seats it is holding have been read back.
 */
export function SeatLabelSummary({ seatLabels, isFramed = true }: SeatLabelSummaryProps) {
  if (seatLabels.length === 0) {
    return (
      <Text fontSize="xs" color="gray.500" lineHeight="1.5">
        Pick seats on the seat map in Sessions and they appear here.
      </Text>
    )
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
      {groupSeatLabels(seatLabels).map((group) => (
        <Stack key={group.key} gap={1}>
          {group.parentName ? (
            <Text fontSize="xs" fontWeight="700" color="gray.600">
              {group.parentName}
            </Text>
          ) : null}
          <Flex gap={1.5} wrap="wrap">
            {group.seatNames.map((seatName) => (
              <Badge
                key={seatName}
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
                {seatName}
              </Badge>
            ))}
          </Flex>
        </Stack>
      ))}
    </Stack>
  )
}

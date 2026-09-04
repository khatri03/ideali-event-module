import { Badge, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { X } from "lucide-react"
import type { EventSeat } from "@/features/events/schemas/eventSeating.schemas"
import { formatCurrencyCode } from "@/utils/format"

interface SelectedSeatsPanelProps {
  /** Seats this cart is holding on the open session. */
  seats: EventSeat[]
  /** Currency the prices are shown in, or null when the event has none set. */
  currencyCode: string | null
  /** Whether a seat is being taken or given up, so the buttons cannot fire twice. */
  isBusy: boolean
  /** Called with the seat label the buyer asked to give up. */
  onReleaseSeat: (objectLabel: string) => void
}

/**
 * The seats the buyer is holding, named one by one.
 *
 * A count would not do: the buyer chose specific seats and has to be able to check that the ones on the basket are
 * the ones on the map, and give up the wrong one without clearing the rest.
 */
export function SelectedSeatsPanel({ seats, currencyCode, isBusy, onReleaseSeat }: SelectedSeatsPanelProps) {
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

  return (
    <Stack gap={2} w="full">
      <Text fontSize="sm" fontWeight="700" color="gray.800">
        Your seats
      </Text>
      {seats.map((seat) => (
        <Flex
          key={seat.objectLabel}
          align="center"
          justify="space-between"
          gap={3}
          px={4}
          py={3}
          borderRadius="14px"
          borderWidth="1px"
          borderColor="gray.200"
          bg="white"
        >
          <Stack gap={0} minW={0}>
            <Text fontSize="sm" fontWeight="700" color="gray.900" truncate>
              Seat {seat.objectLabel}
            </Text>
            <Badge alignSelf="flex-start" colorPalette="gray" fontSize="xs">
              {seat.ticketTypeName}
            </Badge>
          </Stack>
          <Flex align="center" gap={3}>
            <Text fontSize="sm" fontWeight="700" color="gray.900" whiteSpace="nowrap">
              {formatCurrencyCode(seat.price.toFixed(2), currencyCode)}
            </Text>
            <Button
              aria-label={`Remove seat ${seat.objectLabel}`}
              variant="ghost"
              colorPalette="gray"
              minW="11"
              h="11"
              px={0}
              borderRadius="12px"
              cursor={isBusy ? "not-allowed" : "pointer"}
              aria-disabled={isBusy}
              onClick={() => {
                if (isBusy) {
                  return
                }

                onReleaseSeat(seat.objectLabel)
              }}
            >
              <X size={16} aria-hidden />
            </Button>
          </Flex>
        </Flex>
      ))}
    </Stack>
  )
}

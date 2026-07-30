import { Box, Flex, Text } from "@chakra-ui/react"
import { AlertTriangle } from "lucide-react"
import type { EventTicketStatus } from "@/features/events/schemas/eventTicket.schemas"

interface TicketVoidBannerProps {
  ticketStatus: EventTicketStatus
}

const VOID_REASONS: Partial<Record<EventTicketStatus, string>> = {
  Cancelled: "This ticket was cancelled and will not be admitted.",
  Refunded: "This ticket was refunded and will not be admitted.",
}

/** Shown in place of a scannable code, so a dead ticket cannot be presented at the door. */
export function TicketVoidBanner({ ticketStatus }: TicketVoidBannerProps) {
  const reason = VOID_REASONS[ticketStatus] ?? "This ticket is no longer valid."

  return (
    <Flex
      gap={3}
      align="flex-start"
      borderWidth="1px"
      borderColor="red.200"
      borderRadius="14px"
      bg="red.50"
      px={4}
      py={3}
      role="alert"
    >
      <Box color="red.600" mt="2px" flexShrink={0}>
        <AlertTriangle size={18} aria-hidden />
      </Box>
      <Box>
        <Text fontSize="sm" fontWeight="800" color="red.700">
          Ticket {ticketStatus.toLowerCase()}
        </Text>
        <Text fontSize="sm" color="red.700">
          {reason}
        </Text>
      </Box>
    </Flex>
  )
}

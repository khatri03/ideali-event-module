import { Box, Badge, Flex, Text } from "@chakra-ui/react"
import { CalendarDays, MapPin, Users } from "lucide-react"
import { format } from "date-fns"
import type { OrganizerEventListItem } from "@/api/events"

const SETUP_STATE_LABELS: Record<string, string> = {
  InProgress: "In Progress",
  ReadyForReview: "Ready For Review",
  ReadyForSale: "Ready For Sale",
}

const SETUP_STATE_COLORS: Record<string, "gray" | "orange" | "green"> = {
  InProgress: "gray",
  ReadyForReview: "orange",
  ReadyForSale: "green",
}

function formatSetupState(setupState: string, isCancelled: boolean) {
  if (isCancelled) {
    return "Cancelled"
  }

  return SETUP_STATE_LABELS[setupState] ?? setupState.replace(/([a-z])([A-Z])/g, "$1 $2")
}

interface OrganizerEventCardProps {
  event: OrganizerEventListItem
}

export function OrganizerEventCard({ event }: OrganizerEventCardProps) {
  const totalTickets = event.totalAvailableTickets + event.ticketsSold
  const soldPct = totalTickets > 0 ? Math.round((event.ticketsSold / totalTickets) * 100) : 0
  const statusLabel = formatSetupState(event.setupState, event.isCancelled)
  const statusColor = event.isCancelled ? "red" : SETUP_STATE_COLORS[event.setupState] ?? "gray"
  const startDate = event.startDate ? format(new Date(event.startDate), "MMM d, yyyy") : "Not set"
  const endDate = event.endDate ? format(new Date(event.endDate), "MMM d, yyyy") : "Not set"

  return (
    <Box
      bg="card.bg"
      borderRadius="20px"
      overflow="hidden"
      boxShadow="card"
      border="1px solid"
      borderColor="border.subtle"
      _hover={{ boxShadow: "cardHover", transform: "translateY(-2px)" }}
      transition="all 0.2s ease"
    >
      <Box
        h="8px"
        style={{ background: `linear-gradient(90deg, ${event.themeColor ?? "#7551FF"}, ${event.themeColor ?? "#7551FF"}aa)` }}
      />
      <Box p={5}>
        <Flex justify="space-between" align="flex-start" gap={3} mb={3}>
          <Badge
            colorPalette={statusColor}
            variant="subtle"
            borderRadius="full"
            px={3}
            py={1}
            fontSize="10px"
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing="0.08em"
          >
            {statusLabel}
          </Badge>
        </Flex>

        <Text
          fontSize="md"
          fontWeight="700"
          color="text.primary"
          lineHeight={1.3}
          mb={4}
          lineClamp={2}
        >
          {event.name}
        </Text>

        <Flex direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "center" }} justify="space-between" gap={3} mb={4}>
          <Flex align="center" gap={2} minW={0}>
            <Box color="text.secondary" flexShrink={0}>
              <CalendarDays size={13} />
            </Box>
            <Text fontSize="xs" color="text.secondary" fontWeight="500" whiteSpace={{ base: "normal", sm: "nowrap" }}>
              {startDate} to {endDate}
            </Text>
          </Flex>

          <Flex align="center" gap={2} justify={{ base: "flex-start", sm: "flex-end" }} minW={0}>
            <Box color="text.secondary" flexShrink={0}>
              <MapPin size={13} />
            </Box>
            <Text fontSize="xs" color="text.secondary" fontWeight="500" lineClamp={1} textAlign={{ base: "left", sm: "right" }}>
              {event.venueName ?? "Venue not mapped yet"}
            </Text>
          </Flex>
        </Flex>

        <Box mb={4}>
          <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "flex-start", sm: "center" }} gap={1} mb={1}>
            <Flex align="center" gap={1.5} minW={0}>
              <Box color="text.secondary">
                <Users size={12} />
              </Box>
              <Text fontSize="xs" color="text.secondary" fontWeight="500" lineClamp={1}>
                {event.ticketsSold.toLocaleString()} / {totalTickets.toLocaleString()} tickets sold
              </Text>
            </Flex>
            <Text fontSize="xs" fontWeight="700" style={{ color: event.themeColor ?? "#7551FF" }} alignSelf={{ base: "flex-end", sm: "auto" }}>
              {soldPct}%
            </Text>
          </Flex>

          <Box bg="gray.100" _dark={{ bg: "navy.700" }} borderRadius="full" h="5px" overflow="hidden">
            <Box
              h="full"
              borderRadius="full"
              style={{
                width: `${Math.min(soldPct, 100)}%`,
                background: `linear-gradient(90deg, ${event.themeColor ?? "#7551FF"}, ${event.themeColor ?? "#7551FF"}cc)`,
              }}
              transition="width 0.4s ease"
            />
          </Box>
        </Box>

      </Box>
    </Box>
  )
}

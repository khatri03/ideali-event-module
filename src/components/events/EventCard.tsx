import { Box, Text, Flex, Badge } from "@chakra-ui/react"
import { MapPin, Users, Calendar, DollarSign } from "lucide-react"
import { format } from "date-fns"
import type { AppEvent } from "../../types"

const STATUS_COLORS: Record<string, string> = {
  published: "green",
  ongoing: "blue",
  draft: "gray",
  completed: "purple",
  cancelled: "red",
}

const CATEGORY_LABELS: Record<string, string> = {
  conference: "Conference",
  workshop: "Workshop",
  seminar: "Seminar",
  concert: "Concert",
  sports: "Sports",
  networking: "Networking",
  webinar: "Webinar",
  hackathon: "Hackathon",
  other: "Other",
}

interface EventCardProps {
  event: AppEvent
  onEdit?: (event: AppEvent) => void
  onDelete?: (event: AppEvent) => void
}

export function EventCard({ event, onEdit }: EventCardProps) {
  const attendancePct = Math.round((event.attendees / event.capacity) * 100)

  return (
    <Box
      bg="card.bg"
      borderRadius="20px"
      overflow="hidden"
      boxShadow="card"
      _hover={{ boxShadow: "cardHover", transform: "translateY(-3px)" }}
      transition="all 0.25s ease"
      cursor="pointer"
      onClick={() => onEdit?.(event)}
    >
      {/* Color stripe + category badge */}
      <Box
        h="8px"
        style={{ background: `linear-gradient(90deg, ${event.coverColor}, ${event.coverColor}aa)` }}
      />
      <Box p={5}>
        {/* Header */}
        <Flex justify="space-between" align="flex-start" mb={3}>
          <Badge
            colorPalette={STATUS_COLORS[event.status] as "green" | "blue" | "gray" | "purple" | "red"}
            variant="subtle"
            borderRadius="8px"
            px={2}
            py={0.5}
            fontSize="10px"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="0.05em"
          >
            {event.status}
          </Badge>
          <Badge
            variant="outline"
            borderRadius="8px"
            px={2}
            py={0.5}
            fontSize="10px"
            fontWeight="600"
            style={{ borderColor: event.coverColor + "60", color: event.coverColor }}
          >
            {CATEGORY_LABELS[event.category]}
          </Badge>
        </Flex>

        {/* Title */}
        <Text
          fontSize="md"
          fontWeight="700"
          color="text.primary"
          lineHeight={1.3}
          mb={3}
          lineClamp={2}
        >
          {event.title}
        </Text>

        {/* Meta info */}
        <Flex direction="column" gap={2} mb={4}>
          <Flex align="center" gap={2}>
            <Box color="text.secondary"><Calendar size={13} /></Box>
            <Text fontSize="xs" color="text.secondary" fontWeight="500">
              {format(new Date(event.startDate), "MMM d, yyyy")}
            </Text>
          </Flex>
          <Flex align="center" gap={2}>
            <Box color="text.secondary"><MapPin size={13} /></Box>
            <Text fontSize="xs" color="text.secondary" fontWeight="500" lineClamp={1}>
              {event.location}
            </Text>
          </Flex>
        </Flex>

        {/* Attendance bar */}
        <Box mb={4}>
          <Flex justify="space-between" mb={1}>
            <Flex align="center" gap={1.5}>
              <Box color="text.secondary"><Users size={12} /></Box>
              <Text fontSize="xs" color="text.secondary" fontWeight="500">
                {event.attendees.toLocaleString()} / {event.capacity.toLocaleString()}
              </Text>
            </Flex>
            <Text fontSize="xs" fontWeight="700" style={{ color: event.coverColor }}>
              {attendancePct}%
            </Text>
          </Flex>
          <Box bg="gray.100" _dark={{ bg: "navy.700" }} borderRadius="full" h="5px" overflow="hidden">
            <Box
              h="full"
              borderRadius="full"
              style={{
                width: `${Math.min(attendancePct, 100)}%`,
                background: `linear-gradient(90deg, ${event.coverColor}, ${event.coverColor}cc)`,
              }}
              transition="width 0.5s ease"
            />
          </Box>
        </Box>

        {/* Footer */}
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={1}>
            <Box color="text.secondary"><DollarSign size={13} /></Box>
            <Text fontSize="sm" fontWeight="700" color="text.primary">
              {event.price === 0 ? "Free" : `${event.currency} ${event.price}`}
            </Text>
          </Flex>
          <Text fontSize="xs" color="text.secondary" fontWeight="500">
            by {event.organizer}
          </Text>
        </Flex>
      </Box>
    </Box>
  )
}

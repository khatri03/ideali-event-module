import type { KeyboardEvent } from "react"
import { Box, Flex, HStack, Text } from "@chakra-ui/react"
import { CalendarClock, ChevronRight } from "lucide-react"
import type { SeatsIoChartEvent } from "@/api/seatsio"

interface EventCardProps {
  event: SeatsIoChartEvent
  onOpen: (event: SeatsIoChartEvent) => void
}

export function EventCard({ event, onOpen }: EventCardProps) {
  const isLinked = Boolean(event.seatsIoEventKey)

  function handleKeyDown(keyboardEvent: KeyboardEvent<HTMLDivElement>) {
    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault()
      onOpen(event)
    }
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      textAlign="left"
      w="full"
      minH="11"
      borderRadius="16px"
      border="1px solid"
      borderColor="border.subtle"
      bg="card.bg"
      boxShadow="card"
      px={5}
      py={4}
      cursor="pointer"
      transition="border-color 0.15s, transform 0.15s"
      _hover={{ borderColor: "brand.400", transform: "translateY(-1px)" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "brand.500", outlineOffset: "2px" }}
      onClick={() => onOpen(event)}
      onKeyDown={handleKeyDown}
      aria-label={`Open reports for ${event.label}`}
    >
      <Flex align="center" gap={4}>
        <Flex
          align="center"
          justify="center"
          boxSize="44px"
          borderRadius="12px"
          bg="linear-gradient(135deg, rgba(117,81,255,0.14) 0%, rgba(66,42,251,0.08) 100%)"
          color="brand.600"
          flexShrink={0}
        >
          <CalendarClock size={20} />
        </Flex>
        <Box flex="1" minW={0}>
          <Text fontSize="md" fontWeight="800" color="text.primary" lineClamp={1}>
            {event.label || "Untitled event"}
          </Text>
          <Text fontSize="xs" color="text.secondary" wordBreak="break-all" lineClamp={1}>
            {isLinked ? event.seatsIoEventKey : "Not linked to Seats.io yet"}
          </Text>
        </Box>
        <HStack gap={1} color="brand.500" flexShrink={0}>
          <Text fontSize="sm" fontWeight="700" display={{ base: "none", sm: "block" }}>
            Reports
          </Text>
          <ChevronRight size={18} />
        </HStack>
      </Flex>
    </Box>
  )
}

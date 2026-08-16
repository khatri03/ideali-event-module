import { Box, SimpleGrid, Text } from "@chakra-ui/react"
import type { AttendeeCounts } from "@/features/events/schemas/eventCheckIn.schemas"

interface CheckInCountsProps {
  counts: AttendeeCounts
}

const TILES = [
  { key: "arrived", label: "Arrived", color: "status.success.fg", surface: "status.success.bg" },
  { key: "expected", label: "Still expected", color: "status.warning.fg", surface: "status.warning.bg" },
  { key: "issued", label: "Tickets issued", color: "text.primary", surface: "app.bg" },
] as const

export function CheckInCounts({ counts }: CheckInCountsProps) {
  return (
    <SimpleGrid columns={{ base: 3 }} gap={{ base: 2, md: 4 }}>
      {TILES.map((tile) => (
        <Box
          key={tile.key}
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="16px"
          bg={tile.surface}
          px={{ base: 3, md: 5 }}
          py={{ base: 3, md: 4 }}
        >
          <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" lineHeight="1.1" color={tile.color}>
            {counts[tile.key]}
          </Text>
          <Text
            mt={1}
            fontSize={{ base: "2xs", md: "xs" }}
            fontWeight="700"
            color="text.secondary"
            textTransform="uppercase"
            letterSpacing="0.06em"
          >
            {tile.label}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  )
}

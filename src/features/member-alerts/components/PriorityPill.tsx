import { Box, Flex, Text } from "@chakra-ui/react"
import type { AlertPriority } from "@/api/alerts"
import { PRIORITY_COLOR } from "../constants"

interface PriorityPillProps {
  priority: AlertPriority
}

/**
 * Soft, dot-led priority chip used across the notification surfaces. Tint tracks severity via the shared
 * PRIORITY_COLOR palette (Urgent danger, Important warning, Normal/Low neutral) and reads in both themes.
 */
export function PriorityPill({ priority }: PriorityPillProps) {
  return (
    <Flex
      align="center"
      gap={1.5}
      flexShrink={0}
      px={2}
      py="2px"
      borderRadius="full"
      colorPalette={PRIORITY_COLOR[priority]}
      bg="colorPalette.50"
      color="colorPalette.700"
      border="1px solid"
      borderColor="colorPalette.200"
      _dark={{ bg: "colorPalette.950", color: "colorPalette.200", borderColor: "colorPalette.800" }}
    >
      <Box w="5px" h="5px" borderRadius="full" bg="colorPalette.500" flexShrink={0} />
      <Text fontSize="10px" fontWeight="700" letterSpacing="0.04em" textTransform="uppercase" lineHeight={1.4}>
        {priority}
      </Text>
    </Flex>
  )
}

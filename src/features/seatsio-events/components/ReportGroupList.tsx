import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react"
import type { SeatsIoReportGroup } from "@/api/seatsio"

interface ReportGroupListProps {
  groups: SeatsIoReportGroup[]
  /** Number formatter shared with the rest of the screen so counts read the same everywhere. */
  formatCount: (value: number) => string
}

export function ReportGroupList({ groups, formatCount }: ReportGroupListProps) {
  const largest = groups.reduce((max, group) => Math.max(max, group.count), 0)

  return (
    <Stack gap={2.5}>
      {groups.map((group) => {
        const share = largest > 0 ? Math.max(4, Math.round((group.count / largest) * 100)) : 0
        return (
          <Box
            key={group.key || group.label}
            borderRadius="14px"
            border="1px solid"
            borderColor="border.subtle"
            bg="card.bg"
            px={4}
            py={3}
          >
            <Flex justify="space-between" align="center" gap={4}>
              <Text fontSize="sm" fontWeight="600" color="text.primary" wordBreak="break-word">
                {group.label}
              </Text>
              <HStack gap={3} minW="fit-content">
                <Text fontSize="sm" fontWeight="800" color="text.primary" fontVariantNumeric="tabular-nums">
                  {formatCount(group.count)}
                </Text>
              </HStack>
            </Flex>
            <Box mt={2} h="6px" borderRadius="999px" bg="gray.100" _dark={{ bg: "whiteAlpha.200" }} overflow="hidden">
              <Box
                h="full"
                w={`${share}%`}
                borderRadius="999px"
                bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
              />
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}

import { Box, SimpleGrid, Skeleton, SkeletonText, Stack } from "@chakra-ui/react"

/** Mirrors the ticket stub's shape while the ticket loads. */
export function TicketStubSkeleton() {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" bg="white" overflow="hidden">
      <Box bg="gray.200" px={{ base: 5, md: 7 }} py={{ base: 4, md: 5 }}>
        <Skeleton h="3" w="32" mb={2} />
        <Skeleton h="6" w="60" />
      </Box>

      <SimpleGrid
        columns={{ base: 1, md: 2 }}
        gap={{ base: 5, md: 8 }}
        px={{ base: 5, md: 7 }}
        py={{ base: 5, md: 6 }}
        alignItems="start"
      >
        <Stack gap={5}>
          {[0, 1, 2, 3].map((row) => (
            <SkeletonText key={row} noOfLines={2} gap="2" />
          ))}
        </Stack>
        <Skeleton w={{ base: "160px", md: "180px" }} h={{ base: "160px", md: "180px" }} mx="auto" borderRadius="12px" />
      </SimpleGrid>
    </Box>
  )
}

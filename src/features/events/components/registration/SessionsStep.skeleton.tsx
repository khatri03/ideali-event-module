import { Box, Flex, SimpleGrid, Skeleton, Stack } from "@chakra-ui/react"

/** Mirrors the session card grid while the session catalog loads. */
export function SessionsStepSkeleton() {
  return (
    <Stack gap={4}>
      <Flex justify="flex-end">
        <Skeleton h="38px" w="140px" borderRadius="full" />
      </Flex>

      <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4}>
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="20px"
            bg="white"
            overflow="hidden"
            boxShadow="0 10px 24px rgba(15, 23, 42, 0.04)"
          >
            <Box px={4} py={4} borderBottomWidth="1px" borderBottomColor="gray.100" bg="gray.50">
              <Stack gap={3}>
                <Skeleton h="18px" w="70%" borderRadius="full" />
                <Skeleton h="12px" w="45%" borderRadius="full" />
              </Stack>
            </Box>
            <Stack gap={4} px={4} py={4}>
              <Skeleton h="44px" borderRadius="full" />
              <Skeleton h="120px" borderRadius="18px" />
            </Stack>
          </Box>
        ))}
      </SimpleGrid>
    </Stack>
  )
}

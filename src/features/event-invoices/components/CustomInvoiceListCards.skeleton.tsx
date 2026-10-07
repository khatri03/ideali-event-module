import { Box, Flex, Skeleton, Stack } from "@chakra-ui/react"

const PLACEHOLDER_CARDS = 3

/** Mirrors a list card block for block, so nothing shifts when the first page arrives on a narrow screen. */
export function CustomInvoiceListCardsSkeleton() {
  return (
    <Stack gap={3} p={4} aria-hidden="true">
      {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
        <Box key={index} border="1px solid" borderColor="border.subtle" bg="card.bg" borderRadius="16px" p={4}>
          <Flex justify="space-between" align="center" gap={3}>
            <Skeleton h="20px" w="96px" borderRadius="6px" />
            <Skeleton h="24px" w="88px" borderRadius="full" />
          </Flex>
          <Skeleton mt={2} h="22px" w="72px" borderRadius="full" />
          <Stack mt={4} gap={3}>
            <Skeleton h="32px" w="70%" borderRadius="6px" />
            <Skeleton h="44px" w="85%" borderRadius="6px" />
            <Skeleton h="32px" w="50%" borderRadius="6px" />
            <Flex justify="space-between">
              <Skeleton h="32px" w="35%" borderRadius="6px" />
              <Skeleton h="32px" w="25%" borderRadius="6px" />
            </Flex>
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}

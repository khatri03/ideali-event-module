import type { ReactNode } from "react"
import { Box, Flex, Skeleton, SkeletonText, SimpleGrid, Stack } from "@chakra-ui/react"

function CardSkeleton({ children }: { children: ReactNode }) {
  return (
    <Box borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      {children}
    </Box>
  )
}

/** Mirrors the form layout block for block, so nothing shifts once the invoice loads for editing. */
export function EventCustomInvoiceFormPageSkeleton() {
  return (
    <Stack gap={5} maxW="4xl" mx="auto" data-testid="event-custom-invoice-form-skeleton" aria-busy="true">
      <Box borderRadius="20px" bg="brand.700" px={{ base: 4, md: 7 }} py={{ base: 5, md: 6 }}>
        <Stack gap={5}>
          <Skeleton h="44px" w="170px" borderRadius="14px" />
          <Flex gap={4} align="center">
            <Skeleton w="12" h="12" borderRadius="16px" flexShrink={0} />
            <Stack gap={2} flex={1}>
              <Skeleton h="26px" w="240px" />
              <Skeleton h="16px" w="300px" maxW="full" />
            </Stack>
          </Flex>
        </Stack>
      </Box>

      <CardSkeleton>
        <Skeleton h="20px" w="140px" mb={5} />
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} h="46px" borderRadius="12px" />
          ))}
        </SimpleGrid>
      </CardSkeleton>

      <CardSkeleton>
        <Skeleton h="20px" w="120px" mb={5} />
        <Skeleton h="44px" w="240px" borderRadius="12px" mb={4} />
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} h="46px" borderRadius="12px" />
          ))}
        </SimpleGrid>
      </CardSkeleton>

      <CardSkeleton>
        <Skeleton h="20px" w="120px" mb={5} />
        {[0, 1].map((index) => (
          <Skeleton key={index} h="46px" borderRadius="12px" mb={4} />
        ))}
        <Flex justify="flex-end">
          <Skeleton h="90px" w={{ base: "full", md: "360px" }} borderRadius="16px" />
        </Flex>
      </CardSkeleton>

      <CardSkeleton>
        <Skeleton h="20px" w="120px" mb={4} />
        <SkeletonText noOfLines={3} gap="3" />
      </CardSkeleton>
    </Stack>
  )
}

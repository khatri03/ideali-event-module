import type { ReactNode } from "react"
import { Box, Flex, Grid, Skeleton, SkeletonText, SimpleGrid, Stack } from "@chakra-ui/react"

function CardSkeleton({ children }: { children: ReactNode }) {
  return (
    <Box borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      {children}
    </Box>
  )
}

function FieldsSkeleton({ count }: { count: number }) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} h="46px" borderRadius="12px" />
      ))}
    </SimpleGrid>
  )
}

/** Mirrors the two-pane editor block for block, so nothing shifts once the invoice loads for editing. */
export function CustomInvoiceFormPageSkeleton() {
  return (
    <Stack gap={5} maxW="7xl" mx="auto" w="full" data-testid="custom-invoice-form-skeleton" aria-busy="true">
      <Box borderRadius="20px" bg="brand.700" px={{ base: 4, md: 7 }} py={{ base: 5, md: 6 }}>
        <Stack gap={5}>
          <Skeleton h="44px" w="170px" borderRadius="14px" />
          <Flex gap={4} align="center">
            <Skeleton w="12" h="12" borderRadius="16px" flexShrink={0} />
            <Stack gap={2} flex={1} minW={0}>
              <Skeleton h="26px" w="240px" maxW="full" />
              <Skeleton h="16px" w="300px" maxW="full" />
            </Stack>
          </Flex>
        </Stack>
      </Box>

      <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 2fr) minmax(0, 1fr)" }} gap={5} alignItems="start">
        <Stack gap={5} minW={0}>
          <CardSkeleton>
            <Skeleton h="20px" w="120px" mb={5} />
            <FieldsSkeleton count={4} />
          </CardSkeleton>
          <CardSkeleton>
            <Skeleton h="20px" w="120px" mb={5} />
            <Skeleton h="44px" w="240px" maxW="full" borderRadius="12px" mb={4} />
            <FieldsSkeleton count={6} />
          </CardSkeleton>
          <CardSkeleton>
            <Skeleton h="20px" w="120px" mb={5} />
            {[0, 1].map((index) => (
              <Skeleton key={index} h="46px" borderRadius="12px" mb={4} />
            ))}
            <SkeletonText noOfLines={3} gap="3" />
          </CardSkeleton>
        </Stack>

        <CardSkeleton>
          <Stack gap={4}>
            <Skeleton h="20px" w="100px" />
            <Skeleton h="16px" w="full" />
            <Skeleton h="40px" w="160px" maxW="full" />
            <Skeleton h="16px" w="full" />
            <Skeleton h="44px" w="full" borderRadius="14px" />
            <Skeleton h="44px" w="full" borderRadius="14px" />
          </Stack>
        </CardSkeleton>
      </Grid>
    </Stack>
  )
}

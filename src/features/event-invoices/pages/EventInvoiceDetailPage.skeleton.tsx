import type { ReactNode } from "react"
import { Box, Flex, Skeleton, SkeletonText, Stack } from "@chakra-ui/react"

function SectionSkeleton({ children }: { children: ReactNode }) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" p={{ base: 4, md: 6 }}>
      {children}
    </Box>
  )
}

/** Mirrors the loaded layout block for block, so nothing shifts position once the invoice arrives. */
export function EventInvoiceDetailPageSkeleton() {
  return (
    <Stack gap={5}>
      <Box borderRadius="20px" bg="brand.700" px={{ base: 4, md: 7 }} py={{ base: 5, md: 6 }}>
        <Stack gap={5}>
          <Skeleton h="44px" w="170px" borderRadius="14px" />
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" gap={4}>
            <Stack gap={2} flex={1}>
              <Skeleton h="12px" w="70px" />
              <Skeleton h="32px" w="240px" />
              <Skeleton h="18px" w="180px" />
            </Stack>
            <Stack gap={2} align={{ base: "flex-start", md: "flex-end" }}>
              <Skeleton h="32px" w="120px" borderRadius="full" />
              <Skeleton h="16px" w="140px" />
            </Stack>
          </Flex>
        </Stack>
      </Box>

      <SectionSkeleton>
        <Flex direction={{ base: "column", md: "row" }} gap={4} mb={6}>
          <Skeleton h="130px" flex={1} borderRadius="16px" />
          <Skeleton h="130px" flex={1} borderRadius="16px" />
        </Flex>
        <Flex justify="flex-end">
          <Skeleton h="180px" w={{ base: "full", md: "360px" }} borderRadius="16px" />
        </Flex>
      </SectionSkeleton>

      <SectionSkeleton>
        <Skeleton h="20px" w="180px" mb={4} />
        {[0, 1].map((index) => (
          <Skeleton key={index} h="120px" borderRadius="16px" mb={3} />
        ))}
      </SectionSkeleton>

      <SectionSkeleton>
        <Skeleton h="20px" w="180px" mb={4} />
        <Skeleton h="140px" borderRadius="16px" />
      </SectionSkeleton>

      <SectionSkeleton>
        <Skeleton h="20px" w="140px" mb={4} />
        <SkeletonText noOfLines={3} gap="3" />
      </SectionSkeleton>
    </Stack>
  )
}

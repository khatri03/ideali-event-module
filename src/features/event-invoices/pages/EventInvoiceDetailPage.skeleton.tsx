import { Box, Skeleton, SkeletonText, Stack } from "@chakra-ui/react"

export function EventInvoiceDetailPageSkeleton() {
  return (
    <Stack gap={6}>
      <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" p={{ base: 4, md: 6 }}>
        <Skeleton h="28px" w="220px" mb={3} />
        <SkeletonText noOfLines={2} gap="3" />
      </Box>
      <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" p={{ base: 4, md: 6 }}>
        <Skeleton h="20px" w="180px" mb={4} />
        {[0, 1].map((index) => (
          <Skeleton key={index} h="120px" borderRadius="16px" mb={3} />
        ))}
      </Box>
      <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" p={{ base: 4, md: 6 }}>
        <Skeleton h="20px" w="180px" mb={4} />
        <Skeleton h="140px" borderRadius="16px" />
      </Box>
    </Stack>
  )
}

import { Box, SimpleGrid, Skeleton, SkeletonText, Stack } from "@chakra-ui/react"

/** Mirrors the payment method tiles and the breakdown table while the cart is being priced. */
export function PaymentStepSkeleton() {
  return (
    <Stack gap={4}>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
        {[0, 1].map((index) => (
          <Skeleton key={index} h="92px" borderRadius="18px" />
        ))}
      </SimpleGrid>
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="gray.50" p={4}>
        <SkeletonText noOfLines={4} gap="4" />
      </Box>
    </Stack>
  )
}

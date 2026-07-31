import { Box, Grid, Skeleton, Stack } from "@chakra-ui/react"

/** Mirrors StripeCardFields' layout while the PaymentIntent is being created. */
export function StripeCardFieldsSkeleton() {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="white" overflow="hidden">
      <Box px={4} py={3} bg="gray.50" borderBottomWidth="1px" borderBottomColor="gray.200">
        <Skeleton h="16px" w="110px" />
      </Box>

      <Stack gap={4} p={4}>
        <Box>
          <Skeleton h="14px" w="120px" mb={2} />
          <Skeleton h="12" borderRadius="14px" />
        </Box>

        <Grid templateColumns={{ base: "1fr", md: "3fr 1fr 1fr" }} gap={3}>
          <Box>
            <Skeleton h="14px" w="100px" mb={2} />
            <Skeleton h="46px" borderRadius="14px" />
          </Box>
          <Box>
            <Skeleton h="14px" w="60px" mb={2} />
            <Skeleton h="46px" borderRadius="14px" />
          </Box>
          <Box>
            <Skeleton h="14px" w="40px" mb={2} />
            <Skeleton h="46px" borderRadius="14px" />
          </Box>
        </Grid>

        <Skeleton h="11" w={{ base: "full", md: "140px" }} borderRadius="16px" alignSelf={{ base: "stretch", md: "flex-end" }} />
      </Stack>
    </Box>
  )
}

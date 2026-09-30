import { Box, Flex, Skeleton, Stack } from "@chakra-ui/react"

/** Mirrors InvoicePaySummaryCard and the card form beneath it, so the page does not jump when the invoice arrives. */
export function InvoicePaySummaryCardSkeleton() {
  return (
    <Stack gap={4} role="status" aria-label="Loading invoice" aria-busy="true">
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="24px" bg="white" p={{ base: 5, md: 6 }}>
        <Stack gap={5}>
          <Flex justify="space-between" gap={4} direction={{ base: "column", sm: "row" }}>
            <Stack gap={2}>
              <Skeleton h="3" w="16" borderRadius="8px" />
              <Skeleton h="6" w={{ base: "40", md: "48" }} borderRadius="8px" />
            </Stack>
            <Stack gap={2} align={{ base: "flex-start", sm: "flex-end" }}>
              <Skeleton h="3" w="20" borderRadius="8px" />
              <Skeleton h="8" w="32" borderRadius="8px" />
            </Stack>
          </Flex>
          <Stack gap={3} borderTopWidth="1px" borderTopColor="gray.200" pt={5}>
            <Skeleton h="5" w={{ base: "60%", md: "40%" }} borderRadius="8px" />
            <Skeleton h="4" w="full" borderRadius="8px" />
            <Skeleton h="4" w={{ base: "75%", md: "60%" }} borderRadius="8px" />
          </Stack>
        </Stack>
      </Box>
      <InvoicePayFormSkeleton />
    </Stack>
  )
}

/** Holds the card form's space while Stripe's keys load. */
export function InvoicePayFormSkeleton() {
  return <Skeleton borderRadius="18px" h={{ base: "320px", md: "280px" }} />
}

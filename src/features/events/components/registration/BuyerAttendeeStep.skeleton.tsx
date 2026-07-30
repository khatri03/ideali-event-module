import type { ReactNode } from "react"
import { Box, SimpleGrid, Skeleton, Stack } from "@chakra-ui/react"

function ContactFieldsSkeleton() {
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} h="44px" borderRadius="14px" />
      ))}
    </SimpleGrid>
  )
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="24px"
      bg="white"
      p={{ base: 5, md: 6 }}
      boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)"
    >
      <Stack gap={4}>
        <Stack gap={2}>
          <Skeleton h="18px" w="45%" borderRadius="full" />
          <Skeleton h="12px" w="70%" borderRadius="full" />
        </Stack>
        {children}
      </Stack>
    </Box>
  )
}

/** Mirrors the buyer card and the grouped attendee cards while attendee requirements load. */
export function BuyerAttendeeStepSkeleton() {
  return (
    <Stack gap={5}>
      <CardShell>
        <ContactFieldsSkeleton />
      </CardShell>

      <CardShell>
        <Stack gap={4}>
          {[0, 1].map((index) => (
            <Box key={index} borderWidth="1px" borderColor="gray.200" borderRadius="20px" bg="white" p={4}>
              <Stack gap={4}>
                <Skeleton h="16px" w="40%" borderRadius="full" />
                <ContactFieldsSkeleton />
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardShell>
    </Stack>
  )
}

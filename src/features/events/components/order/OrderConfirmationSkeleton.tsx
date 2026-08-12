import { Box, Skeleton, Stack } from "@chakra-ui/react"

export function OrderConfirmationSkeleton() {
  return (
    <Stack gap={4}>
      <Skeleton borderRadius="24px" h={{ base: "140px", md: "120px" }} />
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="24px" bg="white" p={{ base: 5, md: 6 }}>
        <Stack gap={4}>
          <Skeleton h="6" w={{ base: "60%", md: "40%" }} borderRadius="8px" />
          <Skeleton h="4" w={{ base: "80%", md: "55%" }} borderRadius="8px" />
          <Skeleton h="4" w={{ base: "70%", md: "45%" }} borderRadius="8px" />
        </Stack>
      </Box>
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="24px" bg="white" p={{ base: 5, md: 6 }}>
        <Stack gap={3}>
          <Skeleton h="5" w={{ base: "50%", md: "30%" }} borderRadius="8px" />
          <Skeleton h="4" w="full" borderRadius="8px" />
          <Skeleton h="4" w={{ base: "75%", md: "60%" }} borderRadius="8px" />
          <Skeleton h="6" w={{ base: "55%", md: "35%" }} borderRadius="8px" />
        </Stack>
      </Box>
      <Skeleton borderRadius="24px" h={{ base: "180px", md: "160px" }} />
      <Skeleton borderRadius="24px" h={{ base: "150px", md: "100px" }} />
    </Stack>
  )
}
